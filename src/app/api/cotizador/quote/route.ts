import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/db";
import { calcImportQuote } from "@/lib/quote/calcImportQuote";
import { ensurePcram } from "@/lib/chat/chatProductBuilder";
import { ensureProductSpecs } from "@/lib/quote/ensureProductSpecs";
import { ensureProductImage } from "@/lib/quote/ensureProductImage";
import { getPresetCosteo } from "@/lib/quote/presetCosteos";
import { recordProductNcm } from "@/lib/ncm/productCatalog";
import { iibbPctForProvince } from "@/lib/quote/iibbProvinces";
import { rateLimitByIp, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";
import {
  buildProductJsonFromClassifierSnapshot,
  buildUserTextFromClassifier,
} from "@/lib/quote/buildProductJsonFromClassifierSnapshot";
import type { CaseSnapshot, ChatMessage } from "@/lib/clasificar-ncm/types";

export const runtime = "nodejs";

const HOUR_MS = 60 * 60 * 1000;
// 15/h era muy bajo para un importador que cotiza varios productos. Configurable por env.
const QUOTE_RATE_MAX = Number(process.env.RATE_LIMIT_QUOTE_MAX) || 60;

type Body = {
  snapshot?: CaseSnapshot;
  messages?: ChatMessage[];
  bienDeCapital?: boolean;
  exentoTasaEstadistica?: boolean;
  destino?: "uso_propio" | "reventa";
  perfilImportador?: "responsable_inscripto" | "monotributo" | "persona_fisica" | "sociedad";
  iibbProvincia?: string;
};

export async function POST(req: Request) {
  const rl = rateLimitByIp(req, "cotizador-quote", QUOTE_RATE_MAX, HOUR_MS);
  if (!rl.ok) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const snapshot = body?.snapshot;
  const messages = Array.isArray(body?.messages) ? body!.messages! : [];

  if (!snapshot || typeof snapshot !== "object") {
    return NextResponse.json({ error: "Falta snapshot del clasificador." }, { status: 400 });
  }

  const hasPrice = typeof snapshot.purchase?.fobUnitUsd === "number" && (snapshot.purchase.fobUnitUsd as number) > 0;
  const hasQuantity = typeof snapshot.purchase?.quantity === "number" && (snapshot.purchase.quantity as number) > 0;
  const hasOrigin = Boolean(snapshot.purchase?.origin);
  const statusOk = snapshot.status === "resolved" || snapshot.status === "tentative";

  if (!hasPrice) {
    return NextResponse.json(
      { error: "Falta el precio unitario (FOB). Ingresalo antes de cotizar." },
      { status: 400 }
    );
  }
  if (!hasQuantity) {
    return NextResponse.json(
      { error: "Falta la cantidad a importar. Ingresala antes de cotizar." },
      { status: 400 }
    );
  }
  if (!hasOrigin) {
    return NextResponse.json(
      { error: "Falta el origen del producto. Ingresalo antes de cotizar." },
      { status: 400 }
    );
  }
  if (!statusOk) {
    return NextResponse.json(
      { error: "Todavía estamos clasificando el producto. Esperá un momento." },
      { status: 400 }
    );
  }
  // NCM not required: when absent, calcImportQuote uses flat/default tariff rates.
  const userText = buildUserTextFromClassifier(snapshot, messages);
  const productJson = buildProductJsonFromClassifierSnapshot(snapshot, messages);
  const enrichedProduct = await ensurePcram(productJson as Record<string, unknown>).catch(
    () => productJson as Record<string, unknown>
  );

  // Fase 0.c: el snapshot del clasificador no trae peso. Si falta, buscamos la
  // ficha técnica en la web (marca/modelo) → estimación por IA → y si nada da,
  // el motor cae al estimado por NCM. El spinner del front cubre esta latencia.
  // Peso/dimensiones (Fase 0.c) + imagen real del producto, en paralelo.
  await Promise.all([
    ensureProductSpecs(enrichedProduct, { useWebSearch: true }).catch(() => null),
    ensureProductImage(enrichedProduct).catch(() => null),
  ]);

  type QuoteProductInput = Extract<Parameters<typeof calcImportQuote>[0], { mode: "quote" }>["product"];
  let quote: Awaited<ReturnType<typeof calcImportQuote>>;
  try {
    quote = await calcImportQuote({
      mode: "quote",
      product: enrichedProduct as unknown as QuoteProductInput,
      rawUserText: userText,
      bienDeCapital: Boolean(body?.bienDeCapital),
      exentoTasaEstadistica: Boolean(body?.exentoTasaEstadistica),
      destino: body?.destino === "uso_propio" ? "uso_propio" : "reventa",
      perfilImportador: body?.perfilImportador,
      iibbPct: iibbPctForProvince(body?.iibbProvincia),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("NO_PRICE")) {
      return NextResponse.json({ error: "Falta el precio unitario. Ingresalo antes de cotizar." }, { status: 400 });
    }
    console.error("[cotizador/quote] calcImportQuote error", e);
    return NextResponse.json({ error: "No se pudo calcular la cotización. Intentá de nuevo." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const existing = cookieStore.get("ecomex_anon")?.value;
  const anonId = existing && existing.length >= 8 ? existing : crypto.randomUUID();

  // Costeo preset para productos de ejemplo (ej. Alfa Romeo Giulia): se adjunta al
  // quoteJson para que el PDF descargable muestre ese desglose detallado. No cambia
  // el cálculo del motor ni afecta a otros productos.
  const presetCosteo = getPresetCosteo(
    String((enrichedProduct as Record<string, unknown>)?.title ?? ""),
    userText
  );
  // Si hay preset, el total del presupuesto se toma del preset (datos de Forward),
  // tanto en pantalla como en el PDF, para que coincidan (evita el desfasaje).
  if (presetCosteo) {
    quote.totalMinUsd = presetCosteo.totalUsd;
    quote.totalMaxUsd = presetCosteo.totalUsd;
    if (quote.breakdown) {
      quote.breakdown.totalMinUsd = presetCosteo.totalUsd;
      quote.breakdown.totalMaxUsd = presetCosteo.totalUsd;
    }
  }
  const quoteJsonToSave = presetCosteo
    ? { ...(quote as unknown as Record<string, unknown>), presetCosteo }
    : (quote as unknown as Record<string, unknown>);

  let row: Awaited<ReturnType<typeof prisma.quote.create>>;
  try {
    row = await prisma.quote.create({
      data: {
        anonId,
        mode: "quote",
        userText,
        productJson: enrichedProduct as unknown as InputJsonValue,
        quoteJson: quoteJsonToSave as unknown as InputJsonValue,
        totalMinUsd: quote.totalMinUsd ?? undefined,
        totalMaxUsd: quote.totalMaxUsd ?? undefined,
        stage: "quoted",
      },
    });
  } catch (e) {
    console.error("[cotizador/quote] db create error", e);
    return NextResponse.json({ error: "No se pudo guardar la cotización. Intentá de nuevo." }, { status: 500 });
  }

  const finalNcm = (() => {
    const p = enrichedProduct as Record<string, unknown> | null | undefined;
    const fromTop = typeof p?.ncm === "string" ? (p.ncm as string).trim() : "";
    if (fromTop && fromTop !== "9999.99.99") return fromTop;
    const raw = (p?.raw as Record<string, unknown> | undefined) ?? undefined;
    const fromRaw = typeof raw?.ncm === "string" ? (raw.ncm as string).trim() : "";
    if (fromRaw && fromRaw !== "9999.99.99") return fromRaw;
    return undefined;
  })();

  // Autollenado del catálogo de NCM (best-effort, no bloquea la respuesta).
  if (finalNcm) {
    const catName = String((enrichedProduct as Record<string, unknown>)?.title ?? "").trim();
    if (catName) {
      const desc =
        ((enrichedProduct as Record<string, unknown>)?.raw as Record<string, unknown> | undefined)?.pcram as
          | Record<string, unknown>
          | undefined;
      void recordProductNcm({
        name: catName,
        ncm: finalNcm,
        ncmDescription: typeof desc?.title === "string" ? (desc.title as string) : null,
        source: "quote",
      });
    }
  }

  const res = NextResponse.json({
    ok: true as const,
    quoteId: row.id,
    ncm: finalNcm,
    cards: quote.cards,
    totalMinUsd: quote.totalMinUsd,
    totalMaxUsd: quote.totalMaxUsd,
    explanation: quote.explanation,
    assumptions: quote.assumptions ?? [],
    quality: quote.quality,
    breakdown: quote.breakdown ?? null,
    regime: quote.regime ?? null,
    presetCosteo: presetCosteo ?? null,
  });

  res.cookies.set("ecomex_anon", anonId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}
