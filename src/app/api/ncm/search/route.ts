import { searchNcm } from "@/lib/ncm/knowledge/searchNcm";
import { NextResponse } from "next/server";

/**
 * GET /api/ncm/search?q=...&context=... (opcional: texto producto para filtro coherencia)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ error: "Parámetro q requerido" }, { status: 400 });
  }
  const ctx = searchParams.get("context") ?? q;
  const limit = Math.min(30, Math.max(1, Number(searchParams.get("limit")) || 12));
  const hits = searchNcm(q, { limit, productContext: ctx });
  return NextResponse.json({ hits });
}
