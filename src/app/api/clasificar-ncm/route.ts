import { NextResponse } from "next/server";
import { motorResultToTextPipelineResult } from "@/lib/clasificar-ncm/motorResultToTextPipelineResult";
import { runNcmMotor } from "@/lib/clasificar-ncm/runNcmMotor";
import type { CaseSnapshot } from "@/lib/clasificar-ncm/types";

export const runtime = "nodejs";

const MAX_LEN = 60_000;

const idleSnapshot = (): CaseSnapshot => ({
  productType: "unknown",
  status: "idle",
});

/**
 * Sandbox: ejecuta el motor NCM unificado (pipeline completo o modo rápido según env)
 * y devuelve el mismo shape histórico que `productFromTextPipeline` (`result`).
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
    const motor = await runNcmMotor({
      text,
      snapshot: idleSnapshot(),
      prevSnapshot: idleSnapshot(),
      messages: [],
    });
    const result = motorResultToTextPipelineResult(motor);
    return NextResponse.json({ ok: true, ms: Date.now() - started, result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
