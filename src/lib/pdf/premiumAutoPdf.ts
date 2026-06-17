/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Plantilla premium "Autos de tus sueños" — PDF de presupuesto para vehículos.
 *
 * Se usa cuando el quote trae un presetCosteo con premium:"auto" (ej. Alfa
 * Romeo Giulia). Mismo formato A4 apaisado y branding E-Comex que la plantilla
 * estándar, con portada hero (foto del auto), costeo agrupado en secciones con
 * subtotales y banda de total. No afecta al resto de los productos.
 */

import type { PresetCosteo } from "@/lib/quote/presetCosteos";

type QuoteLike = {
  id: string;
  createdAt: Date;
  userText: string;
  productJson: unknown | null;
  quoteJson: unknown;
  totalMinUsd: number | null;
  totalMaxUsd: number | null;
  mode: string;
};

function safeStr(x: unknown) {
  return String(x ?? "").trim();
}

function htmlEscape(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fmtMonthYear(d: Date) {
  try {
    const s = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return d.toISOString().slice(0, 7);
  }
}

function firstImage(product: any): string | null {
  const operatorImg = safeStr(product?.raw?.operatorImageDataUrl);
  if (operatorImg) return operatorImg;
  const imgs: unknown[] = Array.isArray(product?.images) ? product.images : [];
  const found = imgs.find((u) => typeof u === "string" && /^(https?:|data:)/i.test(u as string));
  return (found as string) ?? null;
}

export function renderPremiumAutoPdfHtml(quote: QuoteLike, preset: PresetCosteo): string {
  const product: any = quote.productJson ?? {};
  const title = safeStr(product?.title) || safeStr(quote.userText).slice(0, 60) || "Vehículo";
  const date = fmtMonthYear(quote.createdAt);
  const tagline = safeStr(preset.tagline) || "El auto de tus sueños, puesto en Argentina.";
  const totalText = safeStr(preset.totalText) || "—";
  const img = firstImage(product);

  const rawNcm = safeStr(product?.ncm) || safeStr(product?.raw?.ncm);
  const ncmCode = rawNcm && rawNcm !== "9999.99.99" ? rawNcm : null;
  const pcramBreadcrumbs: string[] = Array.isArray(product?.raw?.pcram?.breadcrumbs)
    ? (product.raw.pcram.breadcrumbs as string[]).filter((s) => typeof s === "string" && s.trim())
    : [];
  const ncmDesc = pcramBreadcrumbs.length ? pcramBreadcrumbs[pcramBreadcrumbs.length - 1]! : null;

  const origin = safeStr(product?.origin);
  const regime = safeStr((quote.quoteJson as any)?.regime?.label);

  const specRows = [
    origin ? { k: "Origen", v: origin } : null,
    ncmCode ? { k: "Posición arancelaria", v: ncmCode } : null,
    regime ? { k: "Régimen", v: regime } : null,
    { k: "Modalidad", v: "Importación llave en mano" },
  ].filter(Boolean) as Array<{ k: string; v: string }>;

  const sections = Array.isArray(preset.sections) ? preset.sections : [];

  const sectionHtml = sections
    .map(
      (sec) => `
      <div class="sec">
        <div class="sec-title">${htmlEscape(sec.title)}</div>
        ${sec.lines
          .map(
            (l) =>
              `<div class="sec-row"><span>${htmlEscape(l.label)}</span><b>${htmlEscape(l.value)}</b></div>`
          )
          .join("")}
        ${
          sec.subtotal
            ? `<div class="sec-subtotal"><span>${htmlEscape(sec.subtotal.label)}</span><b>${htmlEscape(
                sec.subtotal.value
              )}</b></div>`
            : ""
        }
      </div>`
    )
    .join("");

  const heroImg = img
    ? `<div class="hero-img-card"><img src="${htmlEscape(img)}" alt="${htmlEscape(title)}"/></div>`
    : `<div class="hero-img-card hero-img-placeholder"><div>${htmlEscape(title)}</div></div>`;

  const detailImg = img
    ? `<img class="detail-img" src="${htmlEscape(img)}" alt="${htmlEscape(title)}"/>`
    : `<div class="detail-img detail-img-placeholder">[Imagen del vehículo]</div>`;

  const logo = `
    <div class="logo">
      <div class="logo-icon"><span></span><span></span><span></span></div>
      <div class="logo-text">E-COMEX</div>
    </div>`;

  const contactFooter = `
    <div class="contact-strip">
      <span>+54 9 11 2626-8316</span>
      <span>info@e-comex.com.ar</span>
      <span>www.e-comex.com.ar</span>
      <span>Av. Pte. Julio A. Roca 771, 6° Piso — CABA</span>
    </div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Presupuesto — ${htmlEscape(title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  :root { --navy:#1B3464; --navy2:#122347; --light:#264D8C; --gold:#C9A227; --gray:#D8DCE3; --text:#1a202c; --muted:#5d6b85; }
  body { font-family:'Montserrat',sans-serif; color:var(--navy); background:#f0f0f0; }
  .page { width:297mm; height:210mm; position:relative; page-break-after:always; background:#fff; overflow:hidden; }
  .page:last-child { page-break-after:auto; }

  /* ── Portada ── */
  .cover { background:var(--navy); color:#fff; display:flex; }
  .cover-left { width:52%; padding:24mm 0 18mm 20mm; display:flex; flex-direction:column; justify-content:center; position:relative; z-index:2; }
  .cover-kicker { display:inline-block; font-size:12px; font-weight:700; letter-spacing:.32em; color:var(--gold); margin-bottom:14px; }
  .cover-kicker::after { content:""; display:block; width:64px; height:3px; background:var(--gold); margin-top:10px; border-radius:2px; }
  .cover-title { font-size:46px; font-weight:800; line-height:1.05; color:#fff; }
  .cover-tagline { margin-top:14px; font-size:16px; font-weight:500; color:#c9d4ea; max-width:90%; }
  .cover-meta { margin-top:26px; font-size:12px; color:#9fb0d2; font-weight:600; letter-spacing:.06em; }
  .cover-total { margin-top:22px; display:inline-flex; align-items:baseline; gap:14px; background:var(--navy2); border-left:4px solid var(--gold); padding:14px 20px; border-radius:6px; }
  .cover-total .lbl { font-size:11px; font-weight:600; letter-spacing:.08em; color:#9fb0d2; text-transform:uppercase; }
  .cover-total .val { font-size:26px; font-weight:800; color:#fff; }
  .cover-right { width:48%; position:relative; display:flex; align-items:center; justify-content:center; padding:18mm 16mm; }
  .cover-right::before { content:""; position:absolute; inset:0; background:var(--navy2); clip-path:polygon(18% 0, 100% 0, 100% 100%, 0 100%); }
  .hero-img-card { position:relative; z-index:2; width:100%; height:72%; border-radius:14px; overflow:hidden; background:#0d1a36; box-shadow:0 18px 40px rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.12); }
  .hero-img-card img { width:100%; height:100%; object-fit:cover; display:block; }
  .hero-img-placeholder { display:flex; align-items:center; justify-content:center; color:#9fb0d2; font-size:15px; font-weight:600; text-align:center; padding:20px; }
  .cover-logo { position:absolute; top:14mm; right:16mm; z-index:3; }
  .cover .logo-text { color:#fff; }
  .cover .logo-icon span { background:#fff; }
  .cover-footer { position:absolute; bottom:0; left:0; right:0; background:var(--navy2); padding:10px 20mm; display:flex; justify-content:space-between; font-size:10.5px; color:#c9d4ea; z-index:3; }

  .logo { display:flex; align-items:center; gap:9px; }
  .logo-icon { display:flex; flex-direction:column; gap:4px; }
  .logo-icon span { height:4px; background:var(--navy); border-radius:3px; display:block; }
  .logo-icon span:nth-child(1){ width:26px; } .logo-icon span:nth-child(2){ width:21px; } .logo-icon span:nth-child(3){ width:26px; }
  .logo-text { font-size:24px; font-weight:700; color:var(--navy); letter-spacing:.5px; }

  /* ── Página de costeo ── */
  .detail { padding:13mm 16mm 12mm; display:flex; flex-direction:column; }
  .detail-header { display:flex; justify-content:space-between; align-items:center; border-bottom:2px dashed #BFC5D0; padding-bottom:9px; margin-bottom:11px; }
  .detail-header .crumbs { font-size:13px; font-weight:600; }
  .detail-header .crumbs em { font-style:normal; font-weight:400; color:var(--light); }
  .detail-cols { display:flex; gap:22px; flex:1; min-height:0; }
  .col-left { width:34%; display:flex; flex-direction:column; gap:10px; }
  .detail-img { width:100%; height:175px; object-fit:cover; border-radius:10px; border:1px solid #e1e5ec; display:block; }
  .detail-img-placeholder { display:flex; align-items:center; justify-content:center; background:#f3f5f9; color:#8b97ad; font-size:12px; border:1px dashed #c9d0dc; }
  .specs { border:1px solid #e1e5ec; border-radius:10px; overflow:hidden; }
  .specs-h { background:var(--navy); color:#fff; font-size:11px; font-weight:700; letter-spacing:.08em; padding:7px 12px; text-transform:uppercase; }
  .specs-row { display:flex; justify-content:space-between; gap:10px; padding:6.5px 12px; font-size:11px; border-top:1px solid #eef0f5; }
  .specs-row .k { color:var(--muted); font-weight:500; }
  .specs-row .v { color:var(--navy); font-weight:700; text-align:right; }
  .ncm-note { font-size:9.5px; color:#8b97ad; line-height:1.5; }
  .img-disclaimer { font-size:9px; color:#9aa3b5; font-style:italic; }
  .col-right { flex:1; border-left:3px solid var(--navy); padding-left:20px; display:flex; flex-direction:column; }
  .car-name { font-size:21px; font-weight:800; color:var(--navy); margin-bottom:2px; }
  .car-sub { font-size:11px; color:var(--muted); margin-bottom:8px; }
  .sec { margin-bottom:7px; }
  .sec-title { font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--navy); border-bottom:1.5px solid var(--navy); padding-bottom:3px; margin-bottom:3px; }
  .sec-row { display:flex; justify-content:space-between; gap:14px; font-size:10.6px; color:#42506b; padding:1.7px 0; }
  .sec-row b { color:var(--text); font-weight:600; white-space:nowrap; }
  .sec-subtotal { display:flex; justify-content:space-between; gap:14px; font-size:10.8px; font-weight:700; color:var(--navy); background:#eef1f7; border-radius:5px; padding:4px 8px; margin-top:3px; }
  .total-band { margin-top:auto; background:var(--navy); color:#fff; border-radius:10px; padding:12px 18px; display:flex; justify-content:space-between; align-items:center; }
  .total-band .lbl { font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#c9d4ea; }
  .total-band .val { font-size:24px; font-weight:800; }
  .total-band .gold { width:5px; align-self:stretch; background:var(--gold); border-radius:3px; margin-right:14px; }
  .total-left { display:flex; align-items:center; }

  /* ── Observaciones ── */
  .obs { padding:16mm 20mm; }
  .obs-title { font-size:17px; font-weight:700; text-decoration:underline; margin-bottom:14px; }
  .obs p { font-size:12px; line-height:1.8; color:#33415e; margin-bottom:9px; }
  .contact-strip { position:absolute; bottom:0; left:0; right:0; background:var(--navy); color:#fff; padding:10px 20mm; display:flex; justify-content:space-between; font-size:10.5px; }
</style>
</head>
<body>

  <div class="page cover">
    <div class="cover-logo">${logo}</div>
    <div class="cover-left">
      <span class="cover-kicker">AUTOS DE TUS SUEÑOS</span>
      <h1 class="cover-title">${htmlEscape(title)}</h1>
      <p class="cover-tagline">${htmlEscape(tagline)}</p>
      <p class="cover-meta">PRESUPUESTO DE IMPORTACIÓN · ${htmlEscape(date.toUpperCase())}</p>
      <div class="cover-total"><span class="lbl">Total puesto en Argentina</span><span class="val">${htmlEscape(totalText)}</span></div>
    </div>
    <div class="cover-right">${heroImg}</div>
    <div class="cover-footer">
      <span>+54 9 11 2626-8316</span><span>info@e-comex.com.ar</span><span>www.e-comex.com.ar</span><span>Av. Pte. Julio A. Roca 771, 6° Piso — CABA</span>
    </div>
  </div>

  <div class="page detail">
    <div class="detail-header">
      <div class="crumbs"><strong>Rubro:</strong> <em>${htmlEscape(preset.rubro || "Automotriz")}</em> &nbsp;&nbsp; <strong>Producto:</strong> <em>${htmlEscape(title)}</em></div>
      ${logo}
    </div>
    <div class="detail-cols">
      <div class="col-left">
        ${detailImg}
        <div class="specs">
          <div class="specs-h">Ficha de la operación</div>
          ${specRows.map((r) => `<div class="specs-row"><span class="k">${htmlEscape(r.k)}</span><span class="v">${htmlEscape(r.v)}</span></div>`).join("")}
        </div>
        ${ncmDesc ? `<p class="ncm-note">${htmlEscape(ncmDesc)}</p>` : ""}
        <p class="img-disclaimer">Las imágenes pueden diferir levemente respecto del producto final.</p>
      </div>
      <div class="col-right">
        <h2 class="car-name">${htmlEscape(title)}</h2>
        <p class="car-sub">Costeo integral de importación — valores expresados en dólares estadounidenses.</p>
        ${sectionHtml}
        <div class="total-band">
          <div class="total-left"><div class="gold"></div><span class="lbl">Total puesto en Argentina</span></div>
          <span class="val">${htmlEscape(totalText)}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="page obs">
    <div class="detail-header">
      <div class="crumbs"><strong>Rubro:</strong> <em>${htmlEscape(preset.rubro || "Automotriz")}</em> &nbsp;&nbsp; <strong>Producto:</strong> <em>${htmlEscape(title)}</em></div>
      ${logo}
    </div>
    <h3 class="obs-title">Observaciones</h3>
    <p>• Todos los gastos son cotizados en dólares estadounidenses.</p>
    <p>Al momento del pago (1) se toma el tipo de cambio informal o blue para realizar el pago al proveedor en origen de forma anticipada. Al momento del pago (2) se toma el tipo de cambio oficial vendedor del Banco Nación para realizar los pagos en pesos argentinos por transferencia bancaria.</p>
    <p><strong>• Los pagos se realizan en dos partes:</strong></p>
    <p>1. Se abona el precio del producto más los gastos bancarios. Este pago es inicial para poder transferir el monto al proveedor en origen.</p>
    <p>2. Una vez que la carga llega al país, se abona el resto según el análisis enviado.</p>
    <p>• La operación incluye gestión integral: clasificación arancelaria, validación normativa, logística internacional, despacho y nacionalización, gestión DNRPA y entrega.</p>
    <p><strong>Importante:</strong> este presupuesto es orientativo. La validación profesional (clasificación aduanera, requisitos/intervenciones y documentación) es el paso final antes de operar.</p>
    ${contactFooter}
  </div>

</body>
</html>`;
}
