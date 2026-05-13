import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { writeAuditLog } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email/sendEmail";
import { operatorNotificationHtml, userConfirmationHtml } from "@/lib/email/templates";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { action?: "send_expert" | "save_draft" } | null;
  const action = body?.action === "send_expert" ? "send_expert" : "save_draft";

  const cookieStore = await cookies();
  const anonId = cookieStore.get("ecomex_anon")?.value ?? null;
  const token = cookieStore.get("ecomex_auth")?.value ?? null;
  const auth = token ? await verifyAuthToken(token) : null;

  const quote = await prisma.quote.findUnique({
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
  if (!quote) {
    return NextResponse.json({ ok: false, error: "Cotización no encontrada." }, { status: 404 });
  }

  const allowedByUser = Boolean(auth?.sub && quote.userId && quote.userId === auth.sub);
  const allowedByAnon = Boolean(!quote.userId && anonId && quote.anonId === anonId);
  if (!allowedByUser && !allowedByAnon) {
    return NextResponse.json({ ok: false, error: "Sin permisos." }, { status: 403 });
  }

  const nextStage = action === "send_expert" ? "decision_requested" : "refined";
  const updated = await prisma.quote.update({
    where: { id },
    data: { stage: nextStage },
    select: { id: true, stage: true, updatedAt: true },
  });

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
