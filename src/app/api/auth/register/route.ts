import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signAuthToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";

function parseCookies(header: string | null) {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Email inválido." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    // Claim anonymous history (quotes/leads) if present.
    const cookieMap = parseCookies(req.headers.get("cookie"));
    const anonId = cookieMap["ecomex_anon"];
    if (anonId) {
      await prisma.quote.updateMany({
        where: { anonId, userId: null },
        data: { userId: user.id },
      });
      await prisma.lead.updateMany({
        where: { anonId, userId: null },
        data: { userId: user.id },
      });
    }

    const token = await signAuthToken({ sub: user.id, email: user.email });
    const res = NextResponse.json({ ok: true });
    res.cookies.set("ecomex_auth", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (e) {
    // Prisma unique constraint -> user already exists
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json(
        { ok: false, error: "Ese email ya tiene una cuenta." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "No se pudo crear la cuenta." },
      { status: 500 }
    );
  }
}

