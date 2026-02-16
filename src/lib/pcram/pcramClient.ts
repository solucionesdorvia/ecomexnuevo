import "dotenv/config";
import * as cheerio from "cheerio";
import { CacheManager } from "@/lib/pcram/cache";
import { LocalNomenclator } from "@/lib/nomenclator/localNomenclator";

// Ensure Playwright can find installed browsers in local dev/runtime.
// Some environments set a sandbox cache path that may not exist for the dev server.
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "0";

export type PcramTaxRates = Partial<{
  AEC: number;
  DIE: number;
  DII: number;
  TE: number;
  IVA: number;
  "IVA ADIC": number;
  GANANCIAS: number;
  IIBB: number;
}>;

export type PcramTaxRow = {
  /** Human label as shown in PCRAM (cleaned). */
  label: string;
  /** Percent value (e.g. 21 for 21%). */
  ratePct: number;
  /** Raw key cell text from PCRAM HTML. */
  rawLabel: string;
  /** Raw value cell text from PCRAM HTML. */
  rawValue: string;
  /** Normalized label for stable matching/debug (upper, no accents/punct). */
  labelNorm: string;
};

export type PcramDetail = {
  ncmCode: string;
  title?: string;
  breadcrumbs?: string[];
  unit?: string;
  ramo?: string;
  afipCode?: string;
  tramCode?: string;
  taxes: PcramTaxRates;
  /**
   * Full list of tax rows parsed from PCRAM (best-effort).
   * Useful to keep *all* impositive signals even when the label isn't mapped to `taxes`.
   */
  taxRows?: PcramTaxRow[];
  /** Any additional tax labels not mapped into `taxes` (label → pct). */
  taxesExtra?: Record<string, number>;
  /** Normalized label → pct for all parsed rows. */
  taxesByLabel?: Record<string, number>;
  internalTaxes?: {
    label?: string;
    windowFrom?: string; // dd/mm/yyyy
    windowTo?: string; // dd/mm/yyyy
    tiers: Array<{
      minArsExclusive?: number;
      maxArsInclusive?: number;
      ratePct?: number;
      label?: string;
    }>;
    rawText?: string;
  };
  interventions: string[];
  reclassifications: Array<{ label: string; href: string }>;
  source: "cache" | "live";
};

export type PcramNcmSearchResult = {
  ncmCode: string;
  title?: string;
  href?: string;
};

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function withTimeout<T>(p: Promise<T>, timeoutMs: number, label = "timeout"): Promise<T> {
  const ms = Math.max(1000, Math.floor(timeoutMs));
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function fmtNcm(ncmRaw: string) {
  const digits = (ncmRaw || "").replace(/\D/g, "");
  if (digits.length < 6) return "9999.99.99";
  const a = digits.slice(0, 4);
  const b = digits.slice(4, 6);
  const c = digits.slice(6, 8).padEnd(2, "0");
  return `${a}.${b}.${c}`;
}

function isPlaceholderNcm(ncmCode: string) {
  const norm = String(ncmCode || "").trim();
  if (!norm) return true;
  if (norm === "9999.99.99") return true;
  const digits = norm.replace(/\D/g, "");
  return digits === "99999999" || digits.length < 6;
}

function looksLikeUnauthenticatedHtml(html: string) {
  const h = String(html || "");
  // Logged-in pages typically have a logout link; login pages reference login.php and/or have user/pass inputs.
  const hasLogout = /logout\.php/i.test(h);
  const hasLoginRef = /login\.php/i.test(h);
  const hasUserInput = /name=["']user["']/i.test(h) || /id=["']user["']/i.test(h);
  const hasPassInput =
    /name=["']pass["']/i.test(h) ||
    /name=["']password["']/i.test(h) ||
    /id=["']subject["']/i.test(h) ||
    /type=["']password["']/i.test(h);
  const hasLoginForm = hasLoginRef || (hasUserInput && hasPassInput);
  return hasLoginForm && !hasLogout;
}

function parsePercent(s: string) {
  // Accept "14.00%" or "14,00 %" etc.
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

function normLabel(s: string) {
  return String(s || "")
    .toUpperCase()
    .normalize("NFD")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.()]/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTaxRatesFromText(text: string): PcramTaxRates {
  const taxes: PcramTaxRates = {};
  const patterns: Array<[keyof PcramTaxRates, RegExp]> = [
    ["AEC", /\bAEC\b[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
    ["DIE", /\bDIE\b[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
    ["DII", /\bDII\b[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
    ["TE", /(?:\bTE\b|\bTasa Estad[ií]stica\b)[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
    ["IVA", /\bIVA\b(?!\s*ADIC)[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
    [
      "IVA ADIC",
      /(?:\bIVA\s*ADIC\b|\bIVA\s*Adicional\b|\bPercepci[oó]n\s+IVA\b|\bPerc\.?\s*IVA\b)[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i,
    ],
    ["GANANCIAS", /\bGANANCIAS\b[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
    ["IIBB", /(?:\bIIBB\b|\bIngresos Brutos\b)[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
  ];

  for (const [k, re] of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const n = parsePercent(m[1] ?? "");
    if (n != null) taxes[k] = n;
  }
  return taxes;
}

function parseArsAmount(s: string) {
  // "$ 40.253.421,77" → 40253421.77
  const raw = String(s || "").trim();
  const m = raw.match(/([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?)/);
  if (!m?.[1]) return null;
  const n = Number(m[1].replaceAll(".", "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseInternalTaxesFromText(text: string): PcramDetail["internalTaxes"] | undefined {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  if (!/TASA\s+NOMINAL|Impuestos\s+Internos|EXENTO/i.test(t)) return undefined;

  const mWin = t.match(
    /Del\s+(\d{2}\/\d{2}\/\d{4})\s+hasta\s+(\d{2}\/\d{2}\/\d{4})/i
  );
  const windowFrom = mWin?.[1];
  const windowTo = mWin?.[2];

  const amounts = [...t.matchAll(/\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?)/g)]
    .map((x) => parseArsAmount(x[1] ?? ""))
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
    .slice(0, 12);

  // Deduplicate (PCRAM text often repeats thresholds).
  const uniqAmounts: number[] = [];
  for (const n of amounts) {
    const last = uniqAmounts[uniqAmounts.length - 1];
    if (typeof last === "number" && Math.abs(last - n) < 0.0001) continue;
    if (uniqAmounts.some((x) => Math.abs(x - n) < 0.0001)) continue;
    uniqAmounts.push(n);
  }

  const pctMatches = [...t.matchAll(/TASA\s+NOMINAL\s+(\d{1,2})\s*%/gi)]
    .map((x) => Number(x[1]))
    .filter((n) => Number.isFinite(n))
    .slice(0, 6);

  const tiers: NonNullable<PcramDetail["internalTaxes"]>["tiers"] = [];

  const A = uniqAmounts[0];
  const B = uniqAmounts[1];
  const hasExento = /EXENTO/i.test(t);
  const rate0 = pctMatches.includes(0) ? 0 : undefined;
  const rate18 = pctMatches.includes(18) ? 18 : undefined;

  if (typeof A === "number") {
    tiers.push({
      maxArsInclusive: A,
      ratePct: hasExento ? 0 : rate0,
      label: hasExento ? "EXENTO" : rate0 != null ? "TASA NOMINAL 0%" : undefined,
    });
  }
  if (typeof A === "number" && typeof B === "number") {
    tiers.push({
      minArsExclusive: A,
      maxArsInclusive: B,
      ratePct: rate0 ?? 0,
      label: "TASA NOMINAL 0%",
    });
    tiers.push({
      minArsExclusive: B,
      ratePct: rate18 ?? 18,
      label: `TASA NOMINAL ${rate18 ?? 18}%`,
    });
  } else if (typeof A === "number" && rate18 != null) {
    tiers.push({
      minArsExclusive: A,
      ratePct: rate18,
      label: `TASA NOMINAL ${rate18}%`,
    });
  }

  if (!tiers.length) return undefined;

  return {
    windowFrom,
    windowTo,
    tiers,
    rawText: t.slice(0, 900),
  };
}

async function readStorageState(path: string) {
  const fs = await import("node:fs/promises");
  try {
    const buf = await fs.readFile(path, "utf8");
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

async function writeStorageState(path: string, state: any) {
  const fs = await import("node:fs/promises");
  const nodePath = await import("node:path");
  await fs.mkdir(nodePath.dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(state, null, 2), "utf8");
}

export class PcramClient {
  private cache = new CacheManager({
    path: process.env.PCRAM_CACHE_PATH ?? "pcram_cache.db",
    ttlDays: Number(process.env.PCRAM_CACHE_TTL_DAYS ?? "30"),
  });
  private nomenclator = new LocalNomenclator({
    path: process.env.NOMENCLATOR_DB_PATH ?? "nomenclator.db",
  });

  private loginUrl = process.env.PCRAM_LOGIN_URL ?? "https://web.pcram.net/login.php";
  private baseUrl = process.env.PCRAM_BASE_URL ?? "https://web.pcram.net";
  private storageStatePath =
    process.env.PCRAM_STORAGE_STATE_PATH ?? ".scraper/pcram_storage_state.json";

  async searchNcm(
    query: string,
    opts?: {
      limit?: number;
    }
  ): Promise<PcramNcmSearchResult[]> {
    const q = String(query || "").trim();
    if (!q) return [];
    const limit = Math.max(1, Math.min(25, opts?.limit ?? 8));

    // This endpoint returns NCM candidates for free-text queries.
    const url = `${this.baseUrl}/ncm.php?q=${encodeURIComponent(q)}&s=0`;
    const html = await this.fetchWithPlaywright(url);

    // Optional debug dump to help adapt parsers to PCRAM HTML.
    if ((process.env.PCRAM_DUMP_HTML ?? "").toLowerCase() === "true") {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const outDir = path.resolve(process.cwd(), ".scraper");
      await fs.mkdir(outDir, { recursive: true });
      const safe = q
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 40);
      await fs.writeFile(path.join(outDir, `pcram_ncm_query_${safe}.html`), html, "utf8");
    }

    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const out: PcramNcmSearchResult[] = [];

    const parseCode = (s: string) => {
      const m = s.match(/\b(\d{4}\.\d{2}\.\d{2}|\d{8})\b/);
      if (!m?.[1]) return null;
      return fmtNcm(m[1]);
    };

    // Prefer parsing result rows (avoid random links elsewhere in the page).
    $("table tr")
      .toArray()
      .forEach((tr) => {
        if (out.length >= limit) return;
        const tds = $(tr).find("td").toArray();
        if (!tds.length) return;
        const first = $(tds[0]!).text().trim();
        const ncmCode = parseCode(first);
        if (!ncmCode || seen.has(ncmCode) || ncmCode === "9999.99.99") return;

        const titleCell = (tds[1] ?? tds[tds.length - 1]!) as any;
        let title = $(titleCell).text().trim().replace(/\s+/g, " ") || undefined;
        if (!title || title.length < 3) {
          const rowText = $(tr).text().trim().replace(/\s+/g, " ");
          const cleaned = rowText.replace(/\b(\d{4}\.\d{2}\.\d{2}|\d{8})\b/g, "").trim();
          title = cleaned || undefined;
        }

        const href =
          $(tr).find("a[href*='obs.php'], a[href*='detail'], a[href*='q=']").first().attr("href") ??
          undefined;

        seen.add(ncmCode);
        out.push({ ncmCode, title, href });
      });

    // Fallback: some layouts may not use tables; then scan anchors.
    if (out.length === 0) {
      $("a")
        .toArray()
        .forEach((a) => {
          if (out.length >= limit) return;
          const txt = $(a).text().trim();
          const ncmCode = parseCode(txt);
          if (!ncmCode || seen.has(ncmCode) || ncmCode === "9999.99.99") return;
          const href = $(a).attr("href") ?? undefined;
          seen.add(ncmCode);
          out.push({ ncmCode, href });
        });
    }

    // Feed local nomenclator index (free) so we build an up-to-date catalog over time.
    try {
      this.nomenclator.upsert(out.map((r) => ({ ncmCode: r.ncmCode, title: r.title })));
    } catch {
      // ignore
    }
    return out;
  }

  async getDetail(
    ncmCodeInput: string,
    opts?: {
      bypassCache?: boolean;
    }
  ): Promise<PcramDetail> {
    const ncmCode = fmtNcm(ncmCodeInput);
    if (isPlaceholderNcm(ncmCode)) {
      throw new Error("Invalid NCM code");
    }
    const key = `detail:${ncmCode}`;
    if (!opts?.bypassCache) {
      const cached = this.cache.get<PcramDetail>(key);
      if (cached) return { ...cached, source: "cache" };
    }

    const html = await this.fetchDetailHtml(ncmCode);

    // Optional debug dump to help adapt parsers to PCRAM HTML.
    if ((process.env.PCRAM_DUMP_HTML ?? "").toLowerCase() === "true") {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const outDir = path.resolve(process.cwd(), ".scraper");
      await fs.mkdir(outDir, { recursive: true });
      const file = path.join(outDir, `pcram_detail_${ncmCode.replaceAll(".", "")}.html`);
      await fs.writeFile(file, html, "utf8");
    }

    // Guard against login/error pages being parsed as a "valid" detail.
    const htmlText = String(html || "");
    const txt = cheerio.load(htmlText).text();
    const digits = ncmCode.replace(/\D/g, "");
    const looksLikeLogin = looksLikeUnauthenticatedHtml(htmlText);
    const mentionsDigits = digits.length >= 6 && new RegExp(`\\b${digits}\\b`).test(txt);
    const mentionsFormatted = new RegExp(
      `\\b${ncmCode.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`
    ).test(txt);
    if (looksLikeLogin) {
      throw new Error("PCRAM not authenticated");
    }
    // If the page doesn't even mention the requested NCM digits, it's very likely an error/redirect.
    if (!mentionsDigits && !mentionsFormatted) {
      throw new Error("PCRAM detail not found");
    }

    let parsed = this.parseDetail(html, ncmCode);
    if (isPlaceholderNcm(parsed.ncmCode)) {
      throw new Error("PCRAM returned placeholder NCM");
    }

    // Some PCRAM "Impuestos Internos" content is loaded via getDoc() into viewobs.php
    // and is not present in the initial detail HTML. If we detect an INTERNOS link,
    // fetch the doc and parse thresholds/rates from it.
    if (!parsed.internalTaxes) {
      try {
        const $ = cheerio.load(html);
        const internoLink = $("a[href*='viewobs.php']")
          .toArray()
          .map((a) => String($(a).attr("href") ?? ""))
          .map((href) => {
            // href example: javascript:getDoc('I','viewobs.php?d=obs&t=TI&q=8703&c=camping', 'Vehículos automóviles...')
            const m = href.match(/viewobs\.php\?[^']+/i);
            return m?.[0] ? { href, path: m[0] } : null;
          })
          .filter(Boolean)
          .find((x: any) => /t=TI/i.test(String(x.path)) && /q=870|q=871|q=89|c=/i.test(String(x.path))) as
          | { href: string; path: string }
          | undefined;

        // Prefer the explicit "Vehículos automóviles..." doc when present.
        const better = $("a:has(div.Obs_task1)")
          .toArray()
          .map((a) => ({
            txt: $(a).text().trim().replace(/\s+/g, " "),
            href: String($(a).attr("href") ?? ""),
          }))
          .find((x) => /Veh[ií]culos autom[oó]viles, chasis con motor y motores/i.test(x.txt));

        const chosen = better?.href
          ? (() => {
              const m = better.href.match(/viewobs\.php\?[^']+/i);
              return m?.[0] ? { path: m[0], label: better.txt } : null;
            })()
          : internoLink
            ? { path: internoLink.path, label: undefined }
            : null;

        if (chosen?.path) {
          const fullUrl = `${this.baseUrl}/${chosen.path.replace(/^\//, "")}`;

          const state = await readStorageState(this.storageStatePath);
          const cookies: Array<{ name: string; value: string }> = state?.cookies ?? [];
          const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

          const tryFetch = async () => {
            const res = await fetch(fullUrl, {
              redirect: "follow",
              headers: {
                "user-agent":
                  process.env.SCRAPER_USER_AGENT ??
                  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
                cookie: cookieHeader,
                accept: "text/html,*/*;q=0.8",
              },
            });
            const text = await res.text();
            return { ok: res.ok, text };
          };

          let docHtml: string | null = null;
          if (cookieHeader) {
            const r = await tryFetch().catch(() => null);
            if (r?.ok && !looksLikeUnauthenticatedHtml(r.text)) docHtml = r.text;
          }
          if (!docHtml) {
            docHtml = await this.fetchWithPlaywright(fullUrl).catch(() => null);
          }

          if (docHtml) {
            const docText = cheerio.load(docHtml).text();
            const internal = parseInternalTaxesFromText(docText);
            if (internal) {
              parsed = {
                ...parsed,
                internalTaxes: {
                  ...internal,
                  label: chosen.label ?? "Impuestos internos (según umbrales)",
                },
              };
            }
          }
        }
      } catch {
        // ignore
      }
    }
    // Feed local nomenclator with authoritative titles/breadcrumbs.
    try {
      this.nomenclator.upsert([
        { ncmCode: parsed.ncmCode, title: parsed.title, breadcrumbs: parsed.breadcrumbs },
      ]);
    } catch {
      // ignore
    }
    this.cache.set(key, parsed);
    return { ...parsed, source: "live" };
  }

  private detailUrl(ncmCode: string) {
    // PCRAM uses multiple patterns; allow override.
    const tmpl = process.env.PCRAM_DETAIL_URL_TEMPLATE;
    if (tmpl) return tmpl.replace("{ncm}", encodeURIComponent(ncmCode));
    // Observaciones / alícuotas endpoint (requires digits only).
    const digits = ncmCode.replace(/\D/g, "");
    return `${this.baseUrl}/obs.php?q=${encodeURIComponent(digits)}`;
  }

  private async fetchDetailHtml(ncmCode: string) {
    const url = this.detailUrl(ncmCode);

    // Try fast HTTP fetch with stored cookies
    const state = await readStorageState(this.storageStatePath);
    const cookies: Array<{ name: string; value: string; domain?: string; path?: string }> =
      state?.cookies ?? [];
    const cookieHeader = cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    // Dev helper: dump the NCM search page HTML (helps discover correct detail URLs).
    if (
      cookieHeader &&
      process.env.NODE_ENV !== "production" &&
      (process.env.PCRAM_DUMP_HTML ?? "").toLowerCase() === "true"
    ) {
      try {
        const res = await fetch(`${this.baseUrl}/ncm_search.php`, {
          redirect: "follow",
          headers: {
            cookie: cookieHeader,
            "user-agent":
              process.env.SCRAPER_USER_AGENT ??
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            accept: "text/html,*/*;q=0.8",
          },
        });
        const html = await res.text();
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const outDir = path.resolve(process.cwd(), ".scraper");
        await fs.mkdir(outDir, { recursive: true });
        await fs.writeFile(path.join(outDir, "pcram_ncm_search.html"), html, "utf8");
      } catch {
        // ignore
      }
    }

    const tryFetch = async () => {
      const controller = new AbortController();
      const httpTimeoutMs = Number(process.env.PCRAM_HTTP_TIMEOUT_MS ?? "12000");
      const t = setTimeout(() => controller.abort(), Math.max(1000, httpTimeoutMs));
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent":
            process.env.SCRAPER_USER_AGENT ??
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          cookie: cookieHeader,
          accept: "text/html,*/*;q=0.8",
        },
      }).finally(() => clearTimeout(t));
      const text = await res.text();
      return { ok: res.ok, text };
    };

    const looksLikeLoginHtml = (h: string) => looksLikeUnauthenticatedHtml(String(h || ""));

    if (cookieHeader) {
      const r = await tryFetch().catch(() => null);
      if (r?.ok && !looksLikeLoginHtml(r.text)) return r.text;
    }

    // Ensure logged in with Playwright, then fetch with same context.
    return await this.fetchWithPlaywright(url);
  }

  private async fetchWithPlaywright(url: string) {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        storageState: (await readStorageState(this.storageStatePath)) ?? undefined,
      });
      const page = await context.newPage();
      const navTimeoutMs = Number(process.env.PCRAM_NAV_TIMEOUT_MS ?? "20000");
      page.setDefaultTimeout(Math.max(1000, navTimeoutMs));
      page.setDefaultNavigationTimeout(Math.max(1000, navTimeoutMs));
      // Speed: we only need HTML, so block heavy assets.
      await page.route("**/*", (route) => {
        const type = route.request().resourceType();
        if (type === "image" || type === "font" || type === "media") return route.abort();
        return route.continue();
      });

      // Ensure login if needed
      await page.goto(this.loginUrl, { waitUntil: "domcontentloaded", timeout: navTimeoutMs });

      // Dev helper: dump login HTML for selector tuning when dumping is enabled.
      if (
        process.env.NODE_ENV !== "production" &&
        (process.env.PCRAM_DUMP_HTML ?? "").toLowerCase() === "true"
      ) {
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const outDir = path.resolve(process.cwd(), ".scraper");
        await fs.mkdir(outDir, { recursive: true });
        const file = path.join(outDir, "pcram_login.html");
        await fs.writeFile(file, await page.content(), "utf8");
      }

      const needsLogin = await page
        .locator('input[type="password"], input[name="password"]')
        .first()
        .isVisible()
        .catch(() => false);

      if (needsLogin) {
        const user = requireEnv("PCRAM_USER");
        const pass = requireEnv("PCRAM_PASS");

        await page
          .locator(
            'input[name="user"], #user, input[name="usuario"], input[name="username"], input[type="email"]'
          )
          .first()
          .fill(user);
        await page
          .locator(
            'input[name="pass"], #subject, input[name="clave"], input[name="password"], input[type="password"]'
          )
          .first()
          .fill(pass);
        await page
          .locator('button[type="submit"], input[type="submit"], button:has-text("Ingresar")')
          .first()
          .click();
        // Wait for navigation/state change; PCRAM sometimes doesn't reach "networkidle".
        await page.waitForLoadState("domcontentloaded").catch(() => undefined);
        await page.waitForTimeout(350);

        const stillOnLogin =
          /login\.php/i.test(page.url()) ||
          (await page
            .locator('input[type="password"], input[name="password"]')
            .first()
            .isVisible()
            .catch(() => false));
        if (stillOnLogin) {
          throw new Error("PCRAM login failed");
        }
      }

      // Dev helper: dump the NCM search page to understand navigation/link patterns.
      if (
        process.env.NODE_ENV !== "production" &&
        (process.env.PCRAM_DUMP_HTML ?? "").toLowerCase() === "true"
      ) {
        await page.goto(`${this.baseUrl}/ncm_search.php`, { waitUntil: "domcontentloaded" });
        const fs = await import("node:fs/promises");
        const path = await import("node:path");
        const outDir = path.resolve(process.cwd(), ".scraper");
        await fs.mkdir(outDir, { recursive: true });
        await fs.writeFile(path.join(outDir, "pcram_ncm_search.html"), await page.content(), "utf8");
      }

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: navTimeoutMs });

      // Expand internal observation cards that may lazy-render content (e.g. Impuestos Internos for vehicles/boats).
      // Some PCRAM details only show the long text after clicking the task header.
      await page
        .evaluate(() => {
          const re = /Vehículos automóviles|vehiculos automoviles|chasis con motor|barcos|embarc|Impuestos Internos|TASA NOMINAL/i;
          const nodes = Array.from(document.querySelectorAll<HTMLElement>(".Obs_task1"));
          for (const n of nodes.slice(0, 20)) {
            const t = (n.textContent || "").trim();
            if (re.test(t)) {
              try {
                n.click();
              } catch {
                // ignore
              }
            }
          }
        })
        .catch(() => null);
      await page.waitForTimeout(450);

      const html = await page.content();

      const state = await context.storageState();
      await writeStorageState(this.storageStatePath, state);

      await page.close();
      await context.close();
      return html;
    } finally {
      await browser.close();
    }
  }

  private parseDetail(html: string, ncmCode: string): PcramDetail {
    const $ = cheerio.load(html);
    const text = $.text();

    const summary = $("div.alert.alert-info")
      .first()
      .text()
      .trim()
      .replace(/\s+/g, " ");
    const title =
      summary ||
      $("h1").first().text().trim() ||
      $("title").text().trim() ||
      undefined;

    const breadcrumbs = $("nav a")
      .toArray()
      .map((a) => $(a).text().trim())
      .filter(Boolean);

    const taxes: PcramTaxRates = {};
    const taxRows: PcramTaxRow[] = [];
    const taxesExtra: Record<string, number> = {};
    const taxesByLabel: Record<string, number> = {};

    const mapKnownTaxKey = (labelNorm: string): keyof PcramTaxRates | null => {
      // Keep matching robust across PCRAM layouts/labels.
      if (!labelNorm) return null;
      if (labelNorm === "AEC" || labelNorm.includes("A E C")) return "AEC";
      if (labelNorm === "DIE" || labelNorm.includes("DERECHO") || labelNorm.includes("DERECHOS IMPORTACION"))
        return "DIE";
      if (labelNorm === "DII" || labelNorm.includes("DERECHOS IMPORTACION INTRAZONA")) return "DII";
      if (labelNorm === "TE" || labelNorm.includes("TASA ESTADISTICA")) return "TE";
      if (labelNorm.startsWith("IVA ADIC") || labelNorm.includes("IVA ADICIONAL") || labelNorm.includes("PERCEPCION IVA") || labelNorm.includes("PERC IVA"))
        return "IVA ADIC";
      // IVA plain must come after IVA ADIC checks.
      if (labelNorm === "IVA" || (labelNorm.includes("IVA") && !labelNorm.includes("ADIC") && !labelNorm.includes("PERCEP")))
        return "IVA";
      if (labelNorm.includes("GANANCIAS") || labelNorm.includes("PERC GANANCIAS")) return "GANANCIAS";
      if (labelNorm === "IIBB" || labelNorm.includes("INGRESOS BRUTOS") || labelNorm.includes("PERC IIBB"))
        return "IIBB";
      return null;
    };

    const isTaxLike = (labelNorm: string) => {
      return (
        /\b(AEC|DIE|DII|TE|IVA|GANANCIAS|IIBB)\b/.test(labelNorm) ||
        /TASA|DERECH|IMPUEST|PERCEPC|RETENC|ANTIDUMP|COMPENSATOR|SALVAGUARD/.test(labelNorm)
      );
    };

    const parseTaxTables = (scope: cheerio.Cheerio<any>) => {
      scope
        .find("tr")
        .toArray()
        .forEach((tr) => {
          const tds = $(tr).find("td").toArray();
          if (tds.length < 2) return;
          const rawKey = $(tds[0]).text().trim().replace(/\s+/g, " ");
          const rawVal = $(tds[1]).text().trim().replace(/\s+/g, " ");
          if (!rawKey || !rawVal) return;
          // Most PCRAM tax values are percents; don't pull unrelated rows.
          if (!/%/.test(rawVal)) return;
          const val = parsePercent(rawVal);
          if (val == null) return;

          const labelNorm = normLabel(rawKey);
          if (!labelNorm) return;
          // Filter: only keep tax-looking labels to avoid capturing random % from other tables.
          if (!isTaxLike(labelNorm)) return;

          const labelClean = rawKey.trim().replace(/\s+/g, " ");
          taxRows.push({
            label: labelClean,
            ratePct: val,
            rawLabel: rawKey,
            rawValue: rawVal,
            labelNorm,
          });
          taxesByLabel[labelNorm] = val;

          const known = mapKnownTaxKey(labelNorm);
          if (known) {
            (taxes as any)[known] = val;
          } else {
            // Keep anything else (antidumping, compensatory, etc.) without losing information.
            taxesExtra[labelClean] = val;
          }
        });
    };

    // Prefer a dedicated tax section when present, otherwise scan all tables.
    const taxSection = $("section#tax, #tax, .tax, .taxes").first();
    if (taxSection && taxSection.length) parseTaxTables(taxSection);
    if (taxRows.length === 0) parseTaxTables($("table"));

    // Final fallback: regex over full page text when tables aren't present / changed.
    if (Object.keys(taxes).length === 0) {
      Object.assign(taxes, extractTaxRatesFromText(text));
    }

    const interventions = new Set<string>();
    $("a[href*='interv']")
      .toArray()
      .forEach((a) => {
        const t = $(a).text().trim();
        if (t) interventions.add(t);
      });

    // Also search common keywords in text
    for (const k of ["ANMAT", "SENASA", "ENACOM", "INAL", "INTI"]) {
      if (new RegExp(`\\b${k}\\b`, "i").test(text)) interventions.add(k);
    }

    const reclassifications: Array<{ label: string; href: string }> = [];
    $("a[href*='resclasif']")
      .toArray()
      .forEach((a) => {
        const label = $(a).text().trim();
        const href = $(a).attr("href") || "";
        if (href) reclassifications.push({ label: label || "Resclasificación", href });
      });

    const internalTaxes = (() => {
      const parsed = parseInternalTaxesFromText(text);
      if (!parsed) return undefined;
      const label =
        $("div.Obs_task1")
          .toArray()
          .map((d) => $(d).text().trim().replace(/\s+/g, " "))
          .find((s) => /Veh[ií]culos|barcos|embarc|autom[oó]viles/i.test(s)) ??
        undefined;
      return { ...parsed, label };
    })();

    // Best-effort: unit/ramo/afip/tram from nearby labels (varies in PCRAM)
    const pickByLabel = (label: string) => {
      const node = $(`*:contains("${label}")`).first();
      const line = node.text();
      const idx = line.toLowerCase().indexOf(label.toLowerCase());
      if (idx === -1) return undefined;
      return line.slice(idx + label.length).replace(/[:\s]+/, "").trim() || undefined;
    };

    return {
      ncmCode,
      title,
      breadcrumbs: breadcrumbs.length ? breadcrumbs : undefined,
      unit: pickByLabel("Unidad"),
      ramo: pickByLabel("Ramo"),
      afipCode: pickByLabel("AFIP"),
      tramCode: pickByLabel("TRAM"),
      taxes,
      taxRows: taxRows.length ? taxRows.slice(0, 50) : undefined,
      taxesExtra: Object.keys(taxesExtra).length ? taxesExtra : undefined,
      taxesByLabel: Object.keys(taxesByLabel).length ? taxesByLabel : undefined,
      internalTaxes,
      interventions: Array.from(interventions),
      reclassifications,
      source: "live",
    };
  }
}

