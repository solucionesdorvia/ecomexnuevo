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

export type PcramDetail = {
  ncmCode: string;
  title?: string;
  breadcrumbs?: string[];
  unit?: string;
  ramo?: string;
  afipCode?: string;
  tramCode?: string;
  taxes: PcramTaxRates;
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

function fmtNcm(ncmRaw: string) {
  const digits = (ncmRaw || "").replace(/\D/g, "");
  if (digits.length < 6) return "9999.99.99";
  const a = digits.slice(0, 4);
  const b = digits.slice(4, 6);
  const c = digits.slice(6, 8).padEnd(2, "0");
  return `${a}.${b}.${c}`;
}

function parsePercent(s: string) {
  // Accept "14.00%" or "14,00 %" etc.
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n;
}

function extractTaxRatesFromText(text: string): PcramTaxRates {
  const taxes: PcramTaxRates = {};
  const patterns: Array<[keyof PcramTaxRates, RegExp]> = [
    ["AEC", /\bAEC\b[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
    ["DIE", /\bDIE\b[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
    ["DII", /\bDII\b[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
    ["TE", /(?:\bTE\b|\bTasa Estad[ií]stica\b)[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
    ["IVA", /\bIVA\b(?!\s*ADIC)[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
    ["IVA ADIC", /(?:\bIVA\s*ADIC\b|\bIVA\s*Adicional\b)[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*%/i],
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

    let parsed = this.parseDetail(html, ncmCode);

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
            if (r?.ok && !/login\.php|Ingresar|Usuario/i.test(r.text)) docHtml = r.text;
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
      const res = await fetch(url, {
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

    if (cookieHeader) {
      const r = await tryFetch().catch(() => null);
      if (r?.ok && !/login\.php|Ingresar|Usuario/i.test(r.text)) return r.text;
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

      // Ensure login if needed
      await page.goto(this.loginUrl, { waitUntil: "domcontentloaded" });

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
        await page.waitForLoadState("networkidle").catch(() => undefined);
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

      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => undefined);

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
      await page.waitForTimeout(600);
      await page.waitForLoadState("networkidle").catch(() => undefined);

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
    // Prefer structured extraction from the tax table when available.
    $("section#tax tr")
      .toArray()
      .forEach((tr) => {
        const tds = $(tr).find("td").toArray();
        if (tds.length < 2) return;
        const rawKey = $(tds[0]).text().trim().replace(/\s+/g, " ");
        const rawVal = $(tds[1]).text().trim().replace(/\s+/g, " ");
        if (!rawKey || !rawVal) return;

        const keyNorm = rawKey.replace(/\./g, "").toUpperCase();
        const val = parsePercent(rawVal);
        if (val == null) return;

        if (keyNorm === "AEC") taxes.AEC = val;
        else if (keyNorm === "DIE") taxes.DIE = val;
        else if (keyNorm === "DII") taxes.DII = val;
        else if (keyNorm === "TE" || keyNorm.includes("TASA ESTADISTICA")) taxes.TE = val;
        else if (keyNorm === "IVA") taxes.IVA = val;
        else if (keyNorm.startsWith("IVA ADIC")) taxes["IVA ADIC"] = val;
        else if (keyNorm === "GANANCIAS") taxes.GANANCIAS = val;
        else if (keyNorm === "IIBB" || keyNorm.includes("INGRESOS BRUTOS")) taxes.IIBB = val;
      });

    // Fallback: regex over full page text
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
      internalTaxes,
      interventions: Array.from(interventions),
      reclassifications,
      source: "live",
    };
  }
}

