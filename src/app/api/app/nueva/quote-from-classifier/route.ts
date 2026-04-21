import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { calcImportQuote } from "@/lib/quote/calcImportQuote";
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

  const ncm = typeof snapshot.recommendedNcm === "string" ? snapshot.recommendedNcm.trim() : "";
  const ready =
    ncm.length >= 4 &&
    (snapshot.status === "resolved" || snapshot.status === "tentative") &&
    typeof snapshot.confidence === "number";

  if (!ready) {
    return NextResponse.json(
      {
        error:
          "Todavía no hay una posición NCM lista. Respondé las preguntas del analista o esperá a ver una recomendación con confianza.",
      },
      { status: 400 }
    );
  }

  const userText = buildUserTextFromClassifier(snapshot, messages);
  const productJson = buildProductJsonFromClassifierSnapshot(snapshot, messages);

  type QuoteProductInput = Extract<Parameters<typeof calcImportQuote>[0], { mode: "quote" }>["product"];
  const quote = await calcImportQuote({
    mode: "quote",
    product: productJson as unknown as QuoteProductInput,
    rawUserText: userText,
  });

  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const existing = cookieStore.get("ecomex_anon")?.value;
  const anonId = existing && existing.length >= 8 ? existing : crypto.randomUUID();

  const row = await prisma.quote.create({
    data: {
      anonId,
      mode: "quote",
      userText,
      productJson: productJson as unknown as InputJsonValue,
      quoteJson: quote as unknown as InputJsonValue,
      totalMinUsd: quote.totalMinUsd ?? undefined,
      totalMaxUsd: quote.totalMaxUsd ?? undefined,
      stage: "quoted",
      userId: user.id,
    },
  });

  const res = NextResponse.json({
    ok: true as const,
    quoteId: row.id,
    cards: quote.cards,
    totalMinUsd: quote.totalMinUsd,
    totalMaxUsd: quote.totalMaxUsd,
    assistantMessage: quote.explanation,
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
