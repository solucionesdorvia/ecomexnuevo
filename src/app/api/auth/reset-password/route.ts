import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { verifyResetToken, passwordFingerprint } from "@/lib/auth/passwordReset";
import { rateLimitAuth } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MIN_PASSWORD = 8;
const INVALID = "El enlace es inválido o venció. Pedí uno nuevo.";

export async function POST(req: Request) {
  try {
    const limited = rateLimitAuth(req, "reset-password");
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: "Demasiados intentos. Probá otra vez más tarde." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    const ct = req.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as { token?: string; password?: string } | null;
    const token = String(body?.token ?? "").trim();
    const password = String(body?.password ?? "");
    if (!token) {
      return NextResponse.json({ ok: false, error: INVALID }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD) {
      return NextResponse.json(
        { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.` },
        { status: 400 }
      );
    }

    const verified = await verifyResetToken(token);
    if (!verified) {
      return NextResponse.json({ ok: false, error: INVALID }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: verified.userId } });
    if (!user) {
      return NextResponse.json({ ok: false, error: INVALID }, { status: 400 });
    }

    // Single-use: la huella del token debe coincidir con la contraseña ACTUAL.
    // Si ya se usó (o cambió por otra vía), la huella no coincide → rechazado.
    if (passwordFingerprint(user.passwordHash) !== verified.pvh) {
      return NextResponse.json({ ok: false, error: INVALID }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ ok: true, message: "Contraseña actualizada. Ya podés iniciar sesión." });
  } catch (e) {
    console.error("[reset-password] error", e);
    return NextResponse.json({ ok: false, error: "No se pudo restablecer. Intentá de nuevo." }, { status: 500 });
  }
}
