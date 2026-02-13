import "dotenv/config";
import { NextResponse } from "next/server";
import { productFromTextPipeline } from "@/lib/scraper/productFromTextPipeline";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "ascensor").trim();

  try {
    const out = await productFromTextPipeline(q);
    return NextResponse.json({ ok: true, q, out });
  } catch (e) {
    return NextResponse.json(
      { ok: false, q, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

