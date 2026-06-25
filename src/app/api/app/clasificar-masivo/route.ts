import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { buildNcmKnowledgeEvidence } from "@/lib/ncm/knowledge/ncmKnowledgeEvidence";
import { getOfficialTariff } from "@/lib/ncm/tariffRates";
import { lookupProductNcm } from "@/lib/ncm/productCatalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ITEMS = 200;

/**
 * Clasificación masiva (modo despachante): una lista de productos → NCM + DIE de
 * cada uno. Usa el catálogo verificado primero (de oro) y, si no, el motor de
 * evidencia determinístico (instantáneo, sin costo de IA). Marca la confianza para
 * que el operador revise los dudosos. Gateado a operator/admin.
 */
export async function POST(req: Request) {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) return NextResponse.json({ ok: false, error: "No autorizado" }, { status: gate.status });

  const body = (await req.json().catch(() => null)) as { items?: unknown; text?: unknown } | null;
  let items: string[] = [];
  if (Array.isArray(body?.items)) items = (body!.items as unknown[]).map((x) => String(x ?? ""));
  else if (typeof body?.text === "string") items = body.text.split(/\r?\n/);
  items = items.map((s) => s.trim()).filter((s) => s.length >= 2).slice(0, MAX_ITEMS);
  if (!items.length) return NextResponse.json({ ok: false, error: "Enviá al menos un producto." }, { status: 400 });

  const results = await Promise.all(
    items.map(async (q) => {
      // 1) Catálogo verificado (clasificación de oro confirmada por humano).
      const hit = await lookupProductNcm(q).catch(() => null);
      if (hit && hit.verified && hit.ncm) {
        const off = getOfficialTariff(hit.ncm);
        return {
          query: q,
          ncm: hit.ncm,
          description: hit.ncmDescription ?? "",
          diePct: off?.diePct ?? null,
          confidence: "verificado" as const,
          alternatives: [] as string[],
        };
      }
      // 2) Motor de evidencia determinístico.
      const ev = buildNcmKnowledgeEvidence(q);
      const top = ev?.candidates?.[0];
      const ncm = top?.ncm_code ?? "";
      const off = ncm ? getOfficialTariff(ncm) : null;
      const alts = (ev?.candidates ?? []).slice(1, 4).map((c) => c.ncm_code);
      return {
        query: q,
        ncm: ncm || null,
        description: top?.title?.replace(/^\[Cap\.\s*\d+\]\s*/, "") ?? "",
        diePct: off?.diePct ?? null,
        confidence: ncm ? ("estimado" as const) : ("sin_match" as const),
        alternatives: alts,
      };
    })
  );

  const resumen = {
    total: results.length,
    verificados: results.filter((r) => r.confidence === "verificado").length,
    estimados: results.filter((r) => r.confidence === "estimado").length,
    sinMatch: results.filter((r) => r.confidence === "sin_match").length,
  };
  return NextResponse.json({ ok: true, resumen, results });
}
