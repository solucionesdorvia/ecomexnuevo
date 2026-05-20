import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { writeAuditLog } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email/sendEmail";
import { operatorNotificationHtml, userConfirmationHtml } from "@/lib/email/templates";
import { rateLimitByIp, RATE_LIMIT_MESSAGE } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: max 5 expert requests per IP per hour to prevent spam
  const rl = rateLimitByIp(req, "quote-decision", 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { action?: "send_expert" | "save_draft" } | null;
  const action = body?.action === "send_expert" ? "send_expert" : "save_draft";

  const cookieStore = await cookies();
  const anonId = cookieStore.get("ecomex_anon")?.value ?? null;
  const token = cookieStore.get("ecomex_auth")?.value ?? null;
  const auth = token ? await verifyAuthToken(token) : null;

  let quote: {
    id: string;
    anonId: string | null;
    userId: string | null;
    stage: string;
    userText: string;
    productJson: unknown;
    totalMinUsd: number | null;
    totalMaxUsd: number | null;
    leadId: string | null;
    user: { email: string } | null;
    lead: { contact: string; channel: string } | null;
  } | null = null;
  try {
    quote = await prisma.quote.findUnique({
      where: { id },
      select: {
        id: true,
        anonId: true,
        userId: true,
        stage: true,
        userText: true,
        productJson: true,
        totalMinUsd: true,
        totalMaxUsd: true,
        leadId: true,
        user: { select: { email: true } },
        lead: { select: { contact: true, channel: true } },
      },
    });
  } catch (e) {
    console.error("[quote-decision/POST] error finding quote", e);
    return NextResponse.json({ ok: false, error: "No se pudo verificar la cotización." }, { status: 500 });
  }
  if (!quote) {
    return NextResponse.json({ ok: false, error: "Cotización no encontrada." }, { status: 404 });
  }

  const allowedByUser = Boolean(auth?.sub && quote.userId && quote.userId === auth.sub);
  const allowedByAnon = Boolean(!quote.userId && anonId && quote.anonId === anonId);
  if (!allowedByUser && !allowedByAnon) {
    return NextResponse.json({ ok: false, error: "Sin permisos." }, { status: 403 });
  }

  const nextStage = action === "send_expert" ? "decision_requested" : "refined";
  let updated: { id: string; stage: string; updatedAt: Date };
  try {
    updated = await prisma.quote.update({
      where: { id },
      data: { stage: nextStage },
      select: { id: true, stage: true, updatedAt: true },
    });
  } catch (e) {
    console.error("[quote-decision/POST] error updating quote stage", e);
    return NextResponse.json({ ok: false, error: "No se pudo actualizar la cotización." }, { status: 500 });
  }

  await writeAuditLog({
    entityType: "quote",
    entityId: id,
    action,
    actorUserId: auth?.sub ?? null,
    actorRole: auth ? "user" : "guest",
    quoteId: id,
    payload: { fromStage: quote.stage, toStage: nextStage },
  });

  if (action === "send_expert") {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://e-comex.com.ar";
    const operatorEmail = process.env.OPERATOR_EMAIL ?? "info@e-comex.com.ar";
    const quoteUrl = `${appUrl}/cotizador?id=${id}`;
    const adminQuoteUrl = `${appUrl}/interno/cotizaciones/${id}`;

    const product = quote.productJson as { name?: string } | null;
    const productName = product?.name ?? undefined;

    const userEmail = quote.user?.email ?? (quote.lead?.channel === "email" ? quote.lead.contact : null);
    const userContact = quote.user?.email ?? quote.lead?.contact ?? null;

    await Promise.allSettled([
      sendEmail({
        to: operatorEmail,
        subject: `Nueva solicitud de asesoría — ${productName ?? id}`,
        html: operatorNotificationHtml({
          quoteId: id,
          userText: quote.userText,
          productName,
          totalMin: quote.totalMinUsd,
          totalMax: quote.totalMaxUsd,
          userContact,
          quoteUrl: adminQuoteUrl,
        }),
      }),
      userEmail
        ? sendEmail({
            to: userEmail,
            subject: "Tu solicitud fue recibida — E-COMEX",
            html: userConfirmationHtml({
              productName,
              totalMin: quote.totalMinUsd,
              totalMax: quote.totalMaxUsd,
              quoteUrl,
            }),
          })
        : Promise.resolve(),
    ]);
  }

  return NextResponse.json({ ok: true, quote: updated });
}
