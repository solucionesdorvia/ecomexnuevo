import { NextResponse } from "next/server";
import { productFromTextPipeline } from "@/lib/scraper/productFromTextPipeline";

export const runtime = "nodejs";

const MAX_LEN = 60_000;

/**
 * Sandbox: ejecuta el pipeline de texto → NCM (IA + nomenclador local + PCRAM si hay credenciales).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ ok: false, error: "Falta 'text' en el body." }, { status: 400 });
    }
    if (text.length > MAX_LEN) {
      return NextResponse.json(
        { ok: false, error: `El texto supera ${MAX_LEN} caracteres.` },
        { status: 400 }
      );
    }

    const started = Date.now();
    const result = await productFromTextPipeline(text);
    return NextResponse.json({ ok: true, ms: Date.now() - started, result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
