import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signResetToken } from "@/lib/auth/passwordReset";
import { sendEmail } from "@/lib/email/sendEmail";
import { renderBrandedEmail } from "@/lib/email/layout";
import { rateLimitAuth } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** Respuesta uniforme: nunca revelamos si el email existe (anti-enumeración). */
const GENERIC_OK = {
  ok: true,
  message: "Si el email está registrado, te enviamos un enlace para restablecer la contraseña.",
};

function resetBaseUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (env) return env.replace(/\/+$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return "https://e-comex.com.ar";
}

function resetEmailHtml(link: string): string {
  return renderBrandedEmail({
    preheader: "Restablecé tu contraseña de E-COMEX. El enlace vence en 45 minutos.",
    heading: "Restablecé tu contraseña",
    bodyHtml:
      "Recibimos un pedido para restablecer la contraseña de tu cuenta en <strong>E-COMEX</strong>. " +
      "Hacé clic en el botón para elegir una nueva. El enlace vence en <strong>45 minutos</strong>.",
    cta: { label: "Restablecer contraseña", url: link },
    footnoteHtml:
      "Si no pediste esto, ignorá este correo: tu contraseña no cambia hasta que uses el enlace." +
      `<br><br><span style="color:#9aa7b4;">¿El botón no funciona? Copiá y pegá este enlace:</span><br>` +
      `<a href="${link}" target="_blank" style="color:#18C3D6;word-break:break-all;">${link}</a>`,
  });
}

export async function POST(req: Request) {
  try {
    const limited = rateLimitAuth(req, "forgot-password");
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

    const body = (await req.json().catch(() => null)) as { email?: string } | null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@") || email.length > 254) {
      // Mismo cuerpo genérico: no filtramos validación específica.
      return NextResponse.json(GENERIC_OK);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = await signResetToken(user.id, user.passwordHash);
      const link = `${resetBaseUrl(req)}/account/reset?token=${encodeURIComponent(token)}`;
      // Best-effort: si el email falla, igual devolvemos OK genérico (no exponemos infra).
      const res = await sendEmail({
        to: email,
        subject: "Restablecé tu contraseña — E-COMEX",
        html: resetEmailHtml(link),
      });
      if (!res.ok) console.error("[forgot-password] email no enviado:", res.error ?? res.skipped);
    }

    return NextResponse.json(GENERIC_OK);
  } catch (e) {
    console.error("[forgot-password] error", e);
    // Aún ante error devolvemos genérico para no dar señales.
    return NextResponse.json(GENERIC_OK);
  }
}
