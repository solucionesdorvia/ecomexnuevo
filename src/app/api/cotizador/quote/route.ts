import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { InputJsonValue } from "@prisma/client/runtime/client";
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
  const body = (await req.json().catch(() => null)) as Body | null;
  const snapshot = body?.snapshot;
  const messages = Array.isArray(body?.messages) ? body!.messages! : [];

  if (!snapshot || typeof snapshot !== "object") {
    return NextResponse.json({ error: "Falta snapshot del clasificador." }, { status: 400 });
  }

  const ncm = typeof snapshot.recommendedNcm === "string" ? snapshot.recommendedNcm.trim() : "";
  const hasPrice = typeof snapshot.purchase?.fobUnitUsd === "number" && (snapshot.purchase.fobUnitUsd as number) > 0;
  const hasQuantity = typeof snapshot.purchase?.quantity === "number" && (snapshot.purchase.quantity as number) > 0;
  const hasOrigin = Boolean(snapshot.purchase?.origin);
  const hasNcm = ncm.length >= 4 && (snapshot.status === "resolved" || snapshot.status === "tentative");

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
  if (!hasNcm) {
    return NextResponse.json(
      { error: "Faltan datos para armar el presupuesto. Completá la clasificación NCM con el analista." },
      { status: 400 }
    );
  }

  const userText = buildUserTextFromClassifier(snapshot, messages);
  const productJson = buildProductJsonFromClassifierSnapshot(snapshot, messages);
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
    const msg = e instanceof Error ? e.message : "Error inesperado.";
    if (msg.startsWith("NO_PRICE")) {
      return NextResponse.json({ error: "Falta el precio unitario. Ingresalo antes de cotizar." }, { status: 400 });
    }
    throw e;
  }

  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const existing = cookieStore.get("ecomex_anon")?.value;
  const anonId = existing && existing.length >= 8 ? existing : crypto.randomUUID();

  const row = await prisma.quote.create({
    data: {
      anonId,
      mode: "quote",
      userText,
      productJson: enrichedProduct as unknown as InputJsonValue,
      quoteJson: quote as unknown as InputJsonValue,
      totalMinUsd: quote.totalMinUsd ?? undefined,
      totalMaxUsd: quote.totalMaxUsd ?? undefined,
      stage: "quoted",
    },
  });

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
    explanation: quote.explanation,
    assumptions: quote.assumptions ?? [],
    quality: quote.quality,
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
