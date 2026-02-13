import { NextResponse } from "next/server";
import { analyzeProductUrl } from "@/lib/analyzeProduct/analyzeProduct";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { url?: unknown } | null;
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url) {
      return NextResponse.json(
        { error: "Falta 'url' en el body." },
        { status: 400 }
      );
    }

    const result = await analyzeProductUrl(url);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error inesperado.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

