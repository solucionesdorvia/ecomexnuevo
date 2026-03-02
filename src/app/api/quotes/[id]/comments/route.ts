import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/jwt";
import { writeAuditLog } from "@/lib/audit/log";

export const runtime = "nodejs";

async function loadContext(quoteId: string) {
  const cookieStore = await cookies();
  const anonId = cookieStore.get("ecomex_anon")?.value ?? null;
  const token = cookieStore.get("ecomex_auth")?.value ?? null;
  const auth = token ? await verifyAuthToken(token) : null;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { id: true, anonId: true, userId: true },
  });
  if (!quote) return { ok: false as const, status: 404 as const, error: "Cotización no encontrada." };

  const canByUser = Boolean(auth?.sub && quote.userId && quote.userId === auth.sub);
  const canByAnon = Boolean(!quote.userId && anonId && quote.anonId === anonId);
  if (!canByUser && !canByAnon) {
    return { ok: false as const, status: 403 as const, error: "Sin permisos para esta cotización." };
  }

  const user = canByUser
    ? await prisma.user.findUnique({
        where: { id: auth!.sub },
        select: { id: true, email: true, role: true },
      })
    : null;

  return { ok: true as const, quote, auth, user, anonId };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await loadContext(id);
  if (!ctx.ok) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });

  const comments = await prisma.quoteComment.findMany({
    where: { quoteId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      createdAt: true,
      authorRole: true,
      authorLabel: true,
      message: true,
    },
  });

  return NextResponse.json({ ok: true, comments });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await loadContext(id);
  if (!ctx.ok) return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });

  const body = (await req.json().catch(() => null)) as { message?: string } | null;
  const message = String(body?.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ ok: false, error: "Mensaje vacío." }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ ok: false, error: "Mensaje demasiado largo." }, { status: 400 });
  }

  const role = ctx.user?.role ?? "user";
  const asExpert = role === "operator" || role === "admin";
  const authorRole = asExpert ? "expert" : "client";
  const authorLabel = asExpert ? "Experto E-COMEX" : ctx.user?.email ?? "Cliente";

  const created = await prisma.quoteComment.create({
    data: {
      quoteId: id,
      authorUserId: ctx.user?.id ?? null,
      authorRole,
      authorLabel,
      message,
    },
    select: {
      id: true,
      createdAt: true,
      authorRole: true,
      authorLabel: true,
      message: true,
    },
  });

  await writeAuditLog({
    entityType: "quote",
    entityId: id,
    action: "comment_created",
    actorUserId: ctx.user?.id ?? null,
    actorRole: role,
    quoteId: id,
    payload: { authorRole, length: message.length },
  });

  return NextResponse.json({ ok: true, comment: created });
}

