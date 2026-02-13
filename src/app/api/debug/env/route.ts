import "dotenv/config";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasPCRAM = Boolean(process.env.PCRAM_USER && process.env.PCRAM_PASS);
  const hasNomenclator = true;
  const dump = (process.env.PCRAM_DUMP_HTML ?? "").toLowerCase() === "true";

  return NextResponse.json({
    ok: true,
    nodeEnv: process.env.NODE_ENV ?? null,
    hasOpenAI,
    openaiModel: process.env.OPENAI_MODEL ?? null,
    hasPCRAM,
    hasNomenclator,
    pcramDumpEnabled: dump,
    scraperStub: process.env.SCRAPER_STUB ?? null,
    playwrightBrowsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH ?? null,
    time: new Date().toISOString(),
  });
}

