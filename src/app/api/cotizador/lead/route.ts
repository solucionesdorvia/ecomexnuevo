import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { email?: string } | null;
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!email || !email.includes("@") || email.length > 254) {
      return NextResponse.json({ ok: false, error: "Email inválido." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const secure = process.env.NODE_ENV === "production";
    const existing = cookieStore.get("ecomex_anon")?.value;
    const anonId = existing && existing.length >= 8 ? existing : crypto.randomUUID();

    await prisma.lead.upsert({
      where: { contact: email },
      create: { anonId, contact: email, channel: "cotizador_public" },
      update: { anonId },
    });

    const res = NextResponse.json({ ok: true });
    if (!existing) {
      res.cookies.set("ecomex_anon", anonId, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  } catch {
    return NextResponse.json({ ok: true });
  }
}
