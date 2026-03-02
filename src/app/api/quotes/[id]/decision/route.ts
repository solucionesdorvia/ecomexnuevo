import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { writeAuditLog } from "@/lib/audit/log";

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
    select: { id: true, anonId: true, userId: true, stage: true },
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

  return NextResponse.json({ ok: true, quote: updated });
}

