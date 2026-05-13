import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value ?? null;
  const auth = token ? await verifyAuthToken(token) : null;
  if (!auth?.sub) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    company?: string;
  } | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  }

  const data: { name?: string; company?: string } = {};
  if (typeof body.name === "string") data.name = body.name.trim().slice(0, 120);
  if (typeof body.company === "string") data.company = body.company.trim().slice(0, 120);

  const updated = await prisma.user.update({
    where: { id: auth.sub },
    data,
    select: { id: true, name: true, company: true, email: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
