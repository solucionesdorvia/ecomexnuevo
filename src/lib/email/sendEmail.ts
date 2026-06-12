import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

/**
 * Envío de emails. Prioridad:
 *  1. SMTP (casilla del hosting, ej. info@e-comex.com.ar en ServidoraWeb) — como hacía WordPress.
 *  2. Resend (si no hay SMTP configurado).
 *  3. Si no hay ninguno → skipped (no se envía; el caller decide qué hacer).
 *
 * El From sale de EMAIL_FROM; conviene que coincida con la casilla SMTP autenticada
 * (ej. EMAIL_FROM="E-COMEX <info@e-comex.com.ar>") para que el servidor no lo rechace.
 */

const FROM =
  process.env.EMAIL_FROM ??
  (process.env.SMTP_USER ? `E-COMEX <${process.env.SMTP_USER}>` : "E-COMEX <no-reply@e-comex.com.ar>");

let _smtp: Transporter | null = null;
function getSmtp(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (!_smtp) {
    const port = Number(process.env.SMTP_PORT ?? "465");
    // secure=true para 465 (SSL); STARTTLS para 587. Override con SMTP_SECURE.
    const secure =
      process.env.SMTP_SECURE != null ? process.env.SMTP_SECURE === "true" : port === 465;
    _smtp = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
        : undefined,
    });
  }
  return _smtp;
}

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; skipped?: boolean; id?: string; error?: unknown }> {
  // 1) SMTP del hosting (preferido).
  const smtp = getSmtp();
  if (smtp) {
    try {
      const info = await smtp.sendMail({ from: FROM, to, subject, html });
      return { ok: true, id: info.messageId };
    } catch (err) {
      console.error("[email] SMTP error:", err);
      return { ok: false, error: err };
    }
  }

  // 2) Resend (respaldo).
  const resend = getResend();
  if (!resend) {
    console.warn("[email] Sin SMTP_HOST ni RESEND_API_KEY — no se envía el email (skipped)");
    return { ok: false, skipped: true };
  }
  try {
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[email] Resend error:", error);
      return { ok: false, error };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email] Unexpected error:", err);
    return { ok: false, error: err };
  }
}
