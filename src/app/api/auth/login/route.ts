import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signAuthToken } from "@/lib/auth/jwt";
import { rateLimitAuth } from "@/lib/rateLimit";
import { parseCookies } from "@/lib/http/parseCookies";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const limited = rateLimitAuth(req, "login");
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: "Demasiados intentos. Probá otra vez más tarde." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        }
      );
    }

    const ct = req.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
    }

    const body = (await req.json()) as { email?: string; password?: string };
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "").trim();

    if (!email || !email.includes("@") || email.length > 254 || !password) {
      return NextResponse.json(
        { ok: false, error: "Email o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Email o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Email o contraseña incorrectos." },
        { status: 401 }
      );
    }

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
    console.error("[auth/login] error", e);
    return NextResponse.json(
      { ok: false, error: "No se pudo iniciar sesión." },
      { status: 500 }
    );
  }
}

