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

  const operatorEmail = process.env.OPERATOR_EMAIL ?? "info@e-comex.com.ar";
  const nombre = esc(body.nombre?.trim() ?? "");
  const empresa = esc(body.empresa?.trim() ?? "");
  const telefono = esc(body.telefono?.trim() ?? "");
  const web = esc(body.web?.trim() ?? "");
  const mensaje = esc(body.mensaje?.trim() ?? "");
  const emailDisplay = esc(body.email.trim());

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0d1525;border-radius:16px;border:1px solid rgba(24,195,214,0.15);overflow:hidden;max-width:600px;">
        <tr>
          <td style="background:linear-gradient(135deg,#18C3D6,#0ea5b9);padding:28px 32px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#030d18;opacity:0.7;">E-COMEX · Landing</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#030d18;">Nuevo contacto desde la web</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;margin-bottom:20px;">
              ${nombre ? `<tr style="background:rgba(255,255,255,0.03);"><td style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;" width="30%">Nombre</td><td style="padding:10px 16px;font-size:13px;color:#e2e8f0;">${nombre}</td></tr>` : ""}
              ${empresa ? `<tr><td style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;border-top:1px solid rgba(255,255,255,0.04);">Empresa</td><td style="padding:10px 16px;font-size:13px;color:#e2e8f0;border-top:1px solid rgba(255,255,255,0.04);">${empresa}</td></tr>` : ""}
              <tr><td style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;border-top:1px solid rgba(255,255,255,0.04);">Email</td><td style="padding:10px 16px;font-size:13px;color:#18C3D6;border-top:1px solid rgba(255,255,255,0.04);"><a href="mailto:${emailDisplay}" style="color:#18C3D6;">${emailDisplay}</a></td></tr>
              ${telefono ? `<tr><td style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;border-top:1px solid rgba(255,255,255,0.04);">Teléfono</td><td style="padding:10px 16px;font-size:13px;color:#e2e8f0;border-top:1px solid rgba(255,255,255,0.04);"><a href="tel:${telefono}" style="color:#e2e8f0;">${telefono}</a></td></tr>` : ""}
              ${web ? `<tr><td style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;border-top:1px solid rgba(255,255,255,0.04);">Web</td><td style="padding:10px 16px;font-size:13px;color:#18C3D6;border-top:1px solid rgba(255,255,255,0.04);"><a href="${web}" target="_blank" style="color:#18C3D6;">${web}</a></td></tr>` : ""}
            </table>
            ${mensaje ? `<p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Mensaje</p><p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;background:rgba(255,255,255,0.03);border-radius:8px;padding:12px 16px;border-left:3px solid #18C3D6;">${mensaje.replace(/&#x27;/g, "'").replace(/\n/g, "<br>")}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="margin:0;font-size:11px;color:#475569;text-align:center;">E-COMEX · info@e-comex.com.ar · (+54) 11 2626-8316</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const emailResult = await sendEmail({
    to: operatorEmail,
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
