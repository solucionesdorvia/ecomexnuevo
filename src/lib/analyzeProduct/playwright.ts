import type { Page } from "playwright";
import { chromium } from "playwright";

// Ensure Playwright can find installed browsers in local dev/runtime.
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "0";

type PageLoadResult = {
  finalUrl: string;
  html: string;
  contentText: string;
};

function chromeUa() {
  return (
    process.env.SCRAPER_USER_AGENT ??
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36"
  );
}

async function autoScroll(page: Page, steps = 6) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate(({ idx, n }: { idx: number; n: number }) => {
      const y = Math.floor(((idx + 1) / n) * document.body.scrollHeight);
      window.scrollTo(0, y);
    }, { idx: i, n: steps });
    await page.waitForTimeout(450);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

function looksBlocked(html: string) {
  const t = html.toLowerCase();
  return (
    t.includes("captcha") ||
    t.includes("robot check") ||
    t.includes("enter the characters you see") ||
    t.includes("unusual traffic") ||
    t.includes("verify you are a human")
  );
}

export async function fetchPageWithPlaywright(url: string, opts?: { timeoutMs?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 35_000;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: chromeUa(),
      viewport: { width: 1600, height: 1000 },
      locale: "es-AR",
      timezoneId: "America/Argentina/Buenos_Aires",
    });

    // Block only heavy resources; keep images because we need their URLs and some pages require them.
    await context.route("**/*", (route) => {
      const rt = route.request().resourceType();
      if (rt === "font" || rt === "media") return route.abort();
      return route.continue();
    });

    const page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);
    page.setDefaultNavigationTimeout(timeoutMs);

    await page.goto(url, { waitUntil: "domcontentloaded" });
    // Allow hydration/lazy content.
    await page.waitForTimeout(1200);
    await autoScroll(page, 7).catch(() => undefined);
    await page.waitForLoadState("networkidle").catch(() => undefined);

    const html = await page.content();
    const contentText = await page.evaluate(() => {
      const el = document.querySelector("body");
      return (el?.innerText ?? "").slice(0, 60_000);
    });

    const finalUrl = page.url();

    await page.close();
    await context.close();

    return { finalUrl, html, contentText, blocked: looksBlocked(html) };
  } finally {
    await browser.close();
  }
}

export async function withRetries<T>(fn: () => Promise<T>, retries = 2) {
  let lastErr: unknown = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 650 * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Unknown error");
}

export function metaFromHtml(html: string) {
  const get = (attr: "property" | "name", key: string) => {
    const re = new RegExp(
      `<meta[^>]+${attr}=["']${key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    );
    return html.match(re)?.[1]?.trim() || undefined;
  };
  return {
    ogTitle: get("property", "og:title"),
    ogDescription: get("property", "og:description"),
    ogImage: get("property", "og:image"),
    productPriceAmount: get("property", "product:price:amount"),
    productPriceCurrency: get("property", "product:price:currency"),
    twitterTitle: get("name", "twitter:title"),
    twitterDescription: get("name", "twitter:description"),
    description: get("name", "description"),
  };
}

export type { PageLoadResult };

