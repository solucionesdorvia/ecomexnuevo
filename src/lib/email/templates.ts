export function operatorNotificationHtml({
  quoteId,
  userText,
  productName,
  totalMin,
  totalMax,
  userContact,
  quoteUrl,
}: {
  quoteId: string;
  userText: string;
  productName?: string;
  totalMin?: number | null;
  totalMax?: number | null;
  userContact?: string | null;
  quoteUrl: string;
}) {
  const range =
    totalMin != null && totalMax != null
      ? `USD ${totalMin.toLocaleString("es-AR")} – ${totalMax.toLocaleString("es-AR")}`
      : "—";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0d1525;border-radius:16px;border:1px solid rgba(24,195,214,0.15);overflow:hidden;max-width:600px;">
        <tr>
          <td style="background:linear-gradient(135deg,#18C3D6,#0ea5b9);padding:28px 32px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#030d18;opacity:0.7;">E-COMEX · Plataforma de importación</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#030d18;">Nueva solicitud de asesoría</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;">Un usuario solicitó ser derivado a un profesional importador. Aquí está el resumen de la cotización:</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.06);border-radius:10px;overflow:hidden;margin-bottom:20px;">
              <tr style="background:rgba(255,255,255,0.03);">
                <td style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;" width="36%">Cotización</td>
                <td style="padding:10px 16px;font-size:13px;color:#e2e8f0;font-family:monospace;">${quoteId}</td>
              </tr>
              ${productName ? `<tr><td style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;border-top:1px solid rgba(255,255,255,0.04);">Producto</td><td style="padding:10px 16px;font-size:13px;color:#e2e8f0;border-top:1px solid rgba(255,255,255,0.04);">${productName}</td></tr>` : ""}
              <tr>
                <td style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;border-top:1px solid rgba(255,255,255,0.04);">Rango estimado</td>
                <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#18C3D6;border-top:1px solid rgba(255,255,255,0.04);">${range}</td>
              </tr>
              ${userContact ? `<tr><td style="padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;border-top:1px solid rgba(255,255,255,0.04);">Contacto</td><td style="padding:10px 16px;font-size:13px;color:#e2e8f0;border-top:1px solid rgba(255,255,255,0.04);">${userContact}</td></tr>` : ""}
            </table>

            <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Texto original del cliente</p>
            <p style="margin:0 0 24px;font-size:13px;color:#94a3b8;line-height:1.6;background:rgba(255,255,255,0.03);border-radius:8px;padding:12px 16px;border-left:3px solid #18C3D6;">${escapeHtml(userText)}</p>

            <a href="${quoteUrl}" style="display:inline-block;background:#18C3D6;color:#030d18;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Ver cotización completa →</a>
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
}

export function userConfirmationHtml({
  productName,
  totalMin,
  totalMax,
  quoteUrl,
}: {
  productName?: string;
  totalMin?: number | null;
  totalMax?: number | null;
  quoteUrl: string;
}) {
  const range =
    totalMin != null && totalMax != null
      ? `USD ${totalMin.toLocaleString("es-AR")} – ${totalMax.toLocaleString("es-AR")}`
      : null;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0d1525;border-radius:16px;border:1px solid rgba(24,195,214,0.15);overflow:hidden;max-width:600px;">
        <tr>
          <td style="background:linear-gradient(135deg,#18C3D6,#0ea5b9);padding:28px 32px;">
            <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#030d18;opacity:0.7;">E-COMEX · Plataforma de importación</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;color:#030d18;">Tu solicitud fue recibida</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;line-height:1.6;">
              Un profesional importador de nuestro equipo revisará tu consulta y se comunicará con vos a la brevedad.
            </p>
            ${productName ? `<p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Tu consulta</p><p style="margin:0 0 16px;font-size:14px;color:#94a3b8;">${productName}</p>` : ""}
            ${range ? `<p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Estimación preliminar</p><p style="margin:0 0 20px;font-size:18px;font-weight:700;color:#18C3D6;">${range}</p>` : ""}
            <a href="${quoteUrl}" style="display:inline-block;background:#18C3D6;color:#030d18;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px;">Ver mi cotización →</a>
            <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
              Si tenés alguna pregunta, podés escribirnos a <a href="mailto:info@e-comex.com.ar" style="color:#18C3D6;text-decoration:none;">info@e-comex.com.ar</a> o por WhatsApp al <a href="https://wa.me/5491126268316" style="color:#18C3D6;text-decoration:none;">+54 9 11 2626-8316</a>.
            </p>
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
}

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
