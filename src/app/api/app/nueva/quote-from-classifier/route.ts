import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { calcImportQuote } from "@/lib/quote/calcImportQuote";
import { ensurePcram } from "@/lib/chat/chatProductBuilder";
import {
  buildProductJsonFromClassifierSnapshot,
  buildUserTextFromClassifier,
} from "@/lib/quote/buildProductJsonFromClassifierSnapshot";
import type { CaseSnapshot, ChatMessage } from "@/lib/clasificar-ncm/types";

export const runtime = "nodejs";

type Body = {
  snapshot?: CaseSnapshot;
  messages?: ChatMessage[];
};

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  const snapshot = body?.snapshot;
  const messages = Array.isArray(body?.messages) ? body!.messages! : [];

  if (!snapshot || typeof snapshot !== "object") {
    return NextResponse.json({ error: "Falta snapshot del clasificador." }, { status: 400 });
  }

  const hasPurchaseData = Boolean(
    snapshot.purchase?.fobUnitUsd &&
      snapshot.purchase?.quantity &&
      snapshot.purchase?.origin
  );
  const statusOk = snapshot.status === "resolved" || snapshot.status === "tentative";

  if (!hasPurchaseData || !statusOk) {
    return NextResponse.json(
      {
        error: "Faltan datos para armar el presupuesto. Completá precio, cantidad y origen con el analista.",
      },
      { status: 400 }
    );
  }

  // NCM not required: cuando está ausente, calcImportQuote usa tasas planas/default.
  // No bloqueamos la cotización — el usuario ve "Sin clasificar aún" en los supuestos
  // y puede igualmente obtener el presupuesto estimado.
  const userText = buildUserTextFromClassifier(snapshot, messages);
  const productJson = buildProductJsonFromClassifierSnapshot(snapshot, messages);

  // Enriquecer con PCRAM: usa el NCM que confirmó el usuario en el clasificador
  // para traer tasas/intervenciones/descripción oficial. Si falla (sin creds o
  // timeout), seguimos con tasas estimadas.
  const enrichedProduct = await ensurePcram(productJson as Record<string, unknown>).catch(
    () => productJson as Record<string, unknown>
  );

  type QuoteProductInput = Extract<Parameters<typeof calcImportQuote>[0], { mode: "quote" }>["product"];
  let quote: Awaited<ReturnType<typeof calcImportQuote>>;
  try {
    quote = await calcImportQuote({
      mode: "quote",
      product: enrichedProduct as unknown as QuoteProductInput,
      rawUserText: userText,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("NO_PRICE")) {
      return NextResponse.json({ error: "Falta el precio unitario. Ingresalo antes de cotizar." }, { status: 400 });
    }
    console.error("[quote-from-classifier] calcImportQuote error", e);
    return NextResponse.json({ error: "No se pudo calcular la cotización. Intentá de nuevo." }, { status: 500 });
  }

  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const existing = cookieStore.get("ecomex_anon")?.value;
  const anonId = existing && existing.length >= 8 ? existing : crypto.randomUUID();

  let row: Awaited<ReturnType<typeof prisma.quote.create>>;
  try {
    row = await prisma.quote.create({
      data: {
        anonId,
        mode: "quote",
        userText,
        productJson: enrichedProduct as unknown as InputJsonValue,
        quoteJson: quote as unknown as InputJsonValue,
        totalMinUsd: quote.totalMinUsd ?? undefined,
        totalMaxUsd: quote.totalMaxUsd ?? undefined,
        stage: "quoted",
        userId: user.id,
      },
    });
  } catch (e) {
    console.error("[quote-from-classifier] db create error", e);
    return NextResponse.json({ error: "No se pudo guardar la cotización. Intentá de nuevo." }, { status: 500 });
  }

  // NCM final ya enriquecido por PCRAM. Lo devolvemos para que el cliente
  // lo muestre en el card de "Cotización lista" sin tener que esperar a
  // que el motor del chat lo cargue (en flujos donde el usuario cerró
  // diciendo "calculalo" antes de que el motor corriera).
  const finalNcm = (() => {
    const p = enrichedProduct as Record<string, unknown> | null | undefined;
    const fromTop = typeof p?.ncm === "string" ? (p.ncm as string).trim() : "";
    if (fromTop && fromTop !== "9999.99.99") return fromTop;
    const raw = (p?.raw as Record<string, unknown> | undefined) ?? undefined;
    const fromRaw = typeof raw?.ncm === "string" ? (raw.ncm as string).trim() : "";
    if (fromRaw && fromRaw !== "9999.99.99") return fromRaw;
    return undefined;
  })();

  const res = NextResponse.json({
    ok: true as const,
    quoteId: row.id,
    ncm: finalNcm,
    cards: quote.cards,
    totalMinUsd: quote.totalMinUsd,
    totalMaxUsd: quote.totalMaxUsd,
    assistantMessage: quote.explanation,
    explanation: quote.explanation,
    assumptions: quote.assumptions ?? [],
    quality: quote.quality,
    breakdown: quote.breakdown ?? null,
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
