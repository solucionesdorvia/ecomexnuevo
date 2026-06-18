/**
 * Layout HTML de marca para emails transaccionales de E-COMEX.
 *
 * Compatibilidad: tablas + estilos inline (los clientes de correo ignoran CSS
 * externo, flexbox, grid). Botón "bulletproof" para Outlook. Tema claro (mejor
 * entregabilidad y legibilidad que el oscuro de la app).
 */

const BRAND = {
  cyan: "#18C3D6",
  navy: "#0B1622",
  ink: "#1f2a37",
  muted: "#6b7a8d",
  faint: "#9aa7b4",
  bg: "#eef1f5",
  card: "#ffffff",
  ctaText: "#03252b",
  site: "https://e-comex.com.ar",
};

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export type BrandedEmailOptions = {
  /** Texto oculto que se ve en la preview del inbox. */
  preheader: string;
  /** Título principal dentro de la tarjeta. */
  heading: string;
  /** Párrafos del cuerpo (HTML ya escapado/confiable). */
  bodyHtml: string;
  /** Botón de acción (opcional). */
  cta?: { label: string; url: string };
  /** Nota al pie dentro de la tarjeta (HTML, opcional). */
  footnoteHtml?: string;
};

export function renderBrandedEmail(o: BrandedEmailOptions): string {
  const cta = o.cta
    ? `
      <tr>
        <td align="center" style="padding:8px 0 4px">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" bgcolor="${BRAND.cyan}" style="border-radius:12px">
                <a href="${o.cta.url}" target="_blank"
                   style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1;color:${BRAND.ctaText};text-decoration:none;border-radius:12px">
                  ${o.cta.label}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  const footnote = o.footnoteHtml
    ? `<tr><td style="padding:8px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.muted}">${o.footnoteHtml}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <title>E-COMEX</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${BRAND.bg}">${o.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px;max-width:100%;">

          <!-- Header de marca -->
          <tr>
            <td style="background:${BRAND.navy};border-radius:16px 16px 0 0;padding:22px 32px;border-bottom:3px solid ${BRAND.cyan};">
              <span style="font-family:${FONT};font-size:20px;font-weight:800;letter-spacing:1.5px;color:#ffffff;">E&#8209;COMEX</span>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="background:${BRAND.card};border-radius:0 0 16px 16px;padding:32px;box-shadow:0 24px 60px -32px rgba(11,22,34,0.35);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 8px;font-family:${FONT};font-size:21px;font-weight:800;color:${BRAND.navy};line-height:1.3;">
                    ${o.heading}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 22px;font-family:${FONT};font-size:14px;line-height:1.65;color:${BRAND.ink};">
                    ${o.bodyHtml}
                  </td>
                </tr>
                ${cta}
                ${footnote}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;font-family:${FONT};font-size:11px;line-height:1.6;color:${BRAND.faint};text-align:center;">
              © 2026 E-COMEX<br>
              <a href="${BRAND.site}" target="_blank" style="color:${BRAND.muted};text-decoration:none;">e-comex.com.ar</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
