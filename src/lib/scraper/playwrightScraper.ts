import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";

// Ensure Playwright can find installed browsers in local dev/runtime.
process.env.PLAYWRIGHT_BROWSERS_PATH = "0";

type ScrapedProduct = {
  title?: string;
  description?: string;
  origin?: string;
  category?: string;
  ncm?: string;
  fobUsd?: number;
  currency?: string;
  raw?: Record<string, unknown>;
};

type ScraperEnv = {
  loginUrl: string;
  username: string;
  password: string;
  usernameSelector: string;
  passwordSelector: string;
  submitSelector: string;
  loggedInCheckSelector: string;
  storageStatePath: string;
};

function requireEnv(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

function getScraperEnv(): ScraperEnv {
  return {
    loginUrl: requireEnv("SCRAPER_LOGIN_URL"),
    username: requireEnv("SCRAPER_USERNAME"),
    password: requireEnv("SCRAPER_PASSWORD"),
    usernameSelector: requireEnv(
      "SCRAPER_USERNAME_SELECTOR",
      'input[name="username"], input[type="email"], input[name="email"]'
    ),
    passwordSelector: requireEnv(
      "SCRAPER_PASSWORD_SELECTOR",
      'input[name="password"], input[type="password"]'
    ),
    submitSelector: requireEnv(
      "SCRAPER_SUBMIT_SELECTOR",
      'button[type="submit"], input[type="submit"]'
    ),
    loggedInCheckSelector: requireEnv(
      "SCRAPER_LOGGED_IN_CHECK_SELECTOR",
      "body"
    ),
    storageStatePath: requireEnv(
      "SCRAPER_STORAGE_STATE_PATH",
      ".scraper/storageState.json"
    ),
  };
}

async function withBrowser<T>(fn: (b: Browser) => Promise<T>) {
  const browser = await chromium.launch({
    headless: true,
  });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

async function newContext(browser: Browser, env: ScraperEnv) {
  // We attempt to reuse storageState if it exists; if not, we'll login and persist it.
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  const p = path.resolve(process.cwd(), env.storageStatePath);
  let storageState: string | undefined;
  try {
    await fs.access(p);
    storageState = p;
  } catch {
    storageState = undefined;
  }

  const ctx = await browser.newContext({
    storageState,
    viewport: { width: 1280, height: 800 },
    userAgent:
      process.env.SCRAPER_USER_AGENT ??
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  });

  return { ctx, storageStatePathAbs: p };
}

async function ensureLoggedIn(ctx: BrowserContext, env: ScraperEnv) {
  const page = await ctx.newPage();
  await page.goto(env.loginUrl, { waitUntil: "domcontentloaded" });

  // If page already has a logged-in signal, skip.
  const alreadyLoggedIn = await page
    .locator(env.usernameSelector)
    .first()
    .isVisible()
    .then((v) => !v)
    .catch(() => true);

  if (!alreadyLoggedIn) {
    await page.locator(env.usernameSelector).first().fill(env.username);
    await page.locator(env.passwordSelector).first().fill(env.password);
    await page.locator(env.submitSelector).first().click();
  }

  // Give the app a moment to set cookies/session.
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(500);

  // Basic check: we can query a selector that should exist on logged-in pages.
  // Default is "body" (always true) so users can tighten it with env.
  await page.locator(env.loggedInCheckSelector).first().waitFor({
    state: "attached",
    timeout: 15_000,
  });

  await page.close();
}

async function scrapeGenericProduct(page: Page, url: string): Promise<ScrapedProduct> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);

  const data = await page.evaluate(() => {
    const title =
      document.querySelector("meta[property='og:title']")?.getAttribute("content") ??
      document.querySelector("title")?.textContent ??
      undefined;

    const description =
      document
        .querySelector("meta[property='og:description']")
        ?.getAttribute("content") ??
      document.querySelector("meta[name='description']")?.getAttribute("content") ??
      undefined;

    // Try Product JSON-LD (when available)
    const ldJsonNodes = Array.from(
      document.querySelectorAll("script[type='application/ld+json']")
    );
    const ld = ldJsonNodes
      .map((n) => {
        try {
          return JSON.parse(n.textContent || "{}");
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return { title, description, ldCount: ld.length, ld };
  });

  return {
    title: typeof data.title === "string" ? data.title.trim() : undefined,
    description:
      typeof data.description === "string" ? data.description.trim() : undefined,
    raw: {
      url,
      ldCount: (data as any).ldCount,
      ld: (data as any).ld,
    },
  };
}

export async function scrapeWithAuthenticatedBrowser(url: string): Promise<ScrapedProduct> {
  const env = getScraperEnv();

  return await withBrowser(async (browser) => {
    const { ctx, storageStatePathAbs } = await newContext(browser, env);
    try {
      // Always ensure login once per run (uses cached storageState when possible).
      await ensureLoggedIn(ctx, env);

      const page = await ctx.newPage();
      const product = await scrapeGenericProduct(page, url);
      await page.close();

      // Persist session for future calls.
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      await fs.mkdir(path.dirname(storageStatePathAbs), { recursive: true });
      await ctx.storageState({ path: storageStatePathAbs });

      return product;
    } finally {
      await ctx.close();
    }
  });
}

