import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";
import { writeAuditLog } from "@/lib/audit/log";
import { cookies } from "next/headers";
import { rateLimitByIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

const HOUR_MS = 60 * 60 * 1000;

/** Escape HTML special chars to prevent injection in email body. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export async function POST(req: Request) {
  const rl = rateLimitByIp(req, "contact", 5, HOUR_MS);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Demasiados envíos. Intentá en una hora." }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as {
    nombre?: string;
    empresa?: string;
    email?: string;
    telefono?: string;
    web?: string;
    mensaje?: string;
  } | null;

  if (!body?.email || !body.email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Email inválido." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const anonId = cookieStore.get("ecomex_anon")?.value ?? "landing";

  // Save lead to DB (best-effort)
  try {
    await prisma.lead.create({
      data: {
        anonId,
        contact: body.email.trim().toLowerCase(),
        channel: "email",
      },
    });
  } catch {
    // Silent — don't block response if lead save fails
  }

  // Guardar la consulta completa (nombre, mensaje, etc.) para verla en el panel
  // y no perder ningún contacto aunque el email falle. Best-effort.
  await writeAuditLog({
    entityType: "contact",
    entityId: body.email.trim().toLowerCase(),
    action: "contact_submitted",
    payload: {
      nombre: body.nombre?.trim() ?? "",
      empresa: body.empresa?.trim() ?? "",
      email: body.email.trim(),
      telefono: body.telefono?.trim() ?? "",
      web: body.web?.trim() ?? "",
      mensaje: body.mensaje?.trim() ?? "",
      anonId,
    },
  });

  // Destinatario(s) del aviso. OPERATOR_EMAIL puede tener varios separados por coma
  // (ej. "info@e-comex.com.ar,andres@e-comex.com.ar") y se notifica a todos.
  const operatorRaw = process.env.OPERATOR_EMAIL ?? "info@e-comex.com.ar";
  const recipients = operatorRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
  const operatorTo: string | string[] = recipients.length ? recipients : "info@e-comex.com.ar";
  const nombre = esc(body.nombre?.trim() ?? "");
  const empresa = esc(body.empresa?.trim() ?? "");
  const telefono = esc(body.telefono?.trim() ?? "");
  const web = esc(body.web?.trim() ?? "");
  const mensaje = esc(body.mensaje?.trim() ?? "");
  const emailDisplay = esc(body.email.trim());

  const fila = (label: string, value: string) =>
    `<tr>
      <td style="padding:11px 0;font-size:13px;color:#7a8699;width:110px;vertical-align:top;border-bottom:1px solid #eef1f5;">${label}</td>
      <td style="padding:11px 0;font-size:14px;color:#1f2733;border-bottom:1px solid #eef1f5;">${value}</td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#eef1f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3e7ee;">
        <tr>
          <td style="background:#142a5c;padding:20px 30px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:19px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">E-COMEX</td>
              <td align="right" style="font-size:10px;font-weight:bold;color:#9fb2d6;text-transform:uppercase;letter-spacing:0.14em;">Nuevo contacto</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 30px 6px;">
            <p style="margin:0;font-size:13px;color:#7a8699;">Llegó una nueva consulta desde el formulario del sitio:</p>
            <h1 style="margin:8px 0 0;font-size:21px;font-weight:bold;color:#142a5c;">${nombre || emailDisplay}</h1>
            ${empresa ? `<p style="margin:5px 0 0;font-size:14px;color:#7a8699;">${empresa}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 30px 4px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${fila("Email", `<a href="mailto:${emailDisplay}" style="color:#1565c0;text-decoration:none;">${emailDisplay}</a>`)}
              ${telefono ? fila("Teléfono", `<a href="tel:${telefono}" style="color:#1f2733;text-decoration:none;">${telefono}</a>`) : ""}
              ${empresa ? fila("Empresa", empresa) : ""}
              ${web ? fila("Web", `<a href="${web}" target="_blank" style="color:#1565c0;text-decoration:none;">${web}</a>`) : ""}
            </table>
          </td>
        </tr>
        ${mensaje ? `<tr><td style="padding:18px 30px 4px;">
            <p style="margin:0 0 7px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;color:#9aa3b2;">Mensaje</p>
            <div style="background:#f4f6f9;border-left:3px solid #18C3D6;border-radius:6px;padding:14px 16px;font-size:14px;color:#3a4250;line-height:1.65;word-break:break-word;overflow-wrap:break-word;white-space:pre-wrap;">${mensaje.replace(/&#x27;/g, "'")}</div>
          </td></tr>` : ""}
        <tr>
          <td style="padding:24px 30px 28px;">
            <a href="mailto:${emailDisplay}" style="display:inline-block;background:#18C3D6;color:#06222a;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;">Responder a ${nombre || "la consulta"}</a>
          </td>
        </tr>
        <tr>
          <td style="background:#f7f9fc;padding:16px 30px;border-top:1px solid #eef1f5;">
            <p style="margin:0;font-size:11px;color:#9aa3b2;">E-COMEX · info@e-comex.com.ar · (+54) 11 2626-8316 · www.e-comex.com.ar</p>
          </td>
        </tr>
      </table>
      <p style="margin:14px 0 0;font-size:11px;color:#aab1bd;">Aviso automático del formulario de e-comex.com.ar</p>
    </td></tr>
  </table>
</body>
</html>`;

  const emailResult = await sendEmail({
    to: operatorTo,
    subject: `Nuevo contacto desde la web — ${nombre || emailDisplay}`,
    html,
  });

  if (!emailResult.ok && !emailResult.skipped) {
    return NextResponse.json(
      { ok: false, error: "No se pudo enviar el mensaje. Escribinos directamente a info@e-comex.com.ar" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
