import "dotenv/config";

import type { QuoteCard } from "@/lib/quote/calcImportQuote";

type QuoteLike = {
  id: string;
  createdAt: Date;
  userText: string;
  productJson: any;
  quoteJson: any;
  totalMinUsd: number | null;
  totalMaxUsd: number | null;
  mode: string;
};

function fmtMonthYear(d: Date) {
  try {
    return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" })
      .format(d)
      .replace(/^\w/, (c) => c.toUpperCase());
  } catch {
    return d.toISOString().slice(0, 7);
  }
}

function fmtUsdEs(n: number) {
  // "USD 18.919,12"
  const s = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `USD ${s}`;
}

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

function pickCards(quoteJson: any): QuoteCard[] {
  return Array.isArray(quoteJson?.cards) ? (quoteJson.cards as QuoteCard[]) : [];
}

function parseMoneyRangeUsd(value: string) {
  // "$13,500.00 – $16,500.00" or "Marítimo: 35–55 días"
  const t = String(value || "");
  const m = t.match(/\$([0-9,]+(?:\.[0-9]+)?)\s*[–-]\s*\$([0-9,]+(?:\.[0-9]+)?)/);
  if (!m) return null;
  const a = Number(m[1].replaceAll(",", ""));
  const b = Number(m[2].replaceAll(",", ""));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { min: a, max: b };
}

function deriveCostsFromQuote(quote: QuoteLike) {
  const product = quote.productJson ?? {};
  const qty = Math.max(1, Math.floor(Number(product?.quantity ?? 1) || 1));
  const fobUnit = Number(product?.fobUsd ?? 0) || null;
  const fobTotal = fobUnit != null ? fobUnit * qty : null;

  const cards = pickCards(quote.quoteJson);
  const fleteRange = cards.find((c) => c.label === "Flete internacional")?.value;
  const impuestosRange = cards.find((c) => c.label === "Impuestos argentinos")?.value;
  const gestionRange = cards.find((c) => c.label === "Gestión / despacho")?.value;
  const totalRange = cards.find((c) => c.label === "Total puesto en Argentina")?.value;

  const flete = fleteRange ? parseMoneyRangeUsd(fleteRange)?.min ?? null : null;
  const impuestos = impuestosRange ? parseMoneyRangeUsd(impuestosRange)?.min ?? null : null;
  const gestion = gestionRange ? parseMoneyRangeUsd(gestionRange)?.min ?? null : null;
  const total = totalRange ? parseMoneyRangeUsd(totalRange)?.min ?? null : null;

  const breakdown: any = (quote.quoteJson as any)?.breakdown ?? null;

  // Prefer server-calculated breakdown (keeps PDF aligned with quote logic).
  const seguro =
    typeof breakdown?.seguroMinUsd === "number"
      ? breakdown.seguroMinUsd
      : fobTotal != null
        ? fobTotal * 0.01
        : null;

  // Split "gestión" into components to match the template layout.
  // (Best-effort; we keep the sum equal to gestión when available.)
  let honorarios = null as number | null;
  let deposito = null as number | null;
  let transporteNac = null as number | null;
  let transferencia = null as number | null;
  if (
    breakdown &&
    typeof breakdown.honorariosMinUsd === "number" &&
    typeof breakdown.depositoPortuarioMinUsd === "number" &&
    typeof breakdown.transporteNacionalMinUsd === "number" &&
    typeof breakdown.transferenciaIntlMinUsd === "number"
  ) {
    honorarios = breakdown.honorariosMinUsd;
    deposito = breakdown.depositoPortuarioMinUsd;
    transporteNac = breakdown.transporteNacionalMinUsd;
    transferencia = breakdown.transferenciaIntlMinUsd;
  } else if (gestion != null) {
    honorarios = Math.max(150, Math.min(gestion * 0.45, 700));
    deposito = Math.max(80, Math.min(gestion * 0.35, 1800));
    transporteNac = Math.max(50, Math.min(gestion * 0.15, 1000));
    transferencia = Math.max(30, gestion - honorarios - deposito - transporteNac);
  }

  return {
    qty,
    fobUnit,
    fobTotal,
    flete,
    seguro,
    impuestos,
    honorarios,
    deposito,
    transporteNac,
    transferencia,
    total,
  };
}

function renderProductImages(product: any) {
  const imgs: string[] = Array.isArray(product?.images) ? product.images : [];
  const title = safeStr(product?.title) || "Producto";
  const blocks = [imgs[0], imgs[1]].map((src, idx) => {
    if (src) {
      return `<img class="product-image" src="${htmlEscape(src)}" alt="Imagen producto ${idx + 1}"/>`;
    }
    return `<div class="product-image-placeholder">[Imagen Producto ${idx + 1}]<br>${htmlEscape(
      title
    )}</div>`;
  });
  return blocks.join("\n");
}

export function renderQuotePdfHtml(quote: QuoteLike) {
  const product = quote.productJson ?? {};
  const title = safeStr(product?.title) || safeStr(quote.userText) || "Producto";
  const rubro = safeStr(product?.category) || (quote.mode === "budget" ? "Presupuesto" : "General");
  const productos = title;

  const costs = deriveCostsFromQuote(quote);

  const date = fmtMonthYear(quote.createdAt);

  const totalToShow = costs.total ?? quote.totalMinUsd ?? null;
  const totalToPay = totalToShow; // For now keep same; can be refined later.

  // NOTE: Product requirement says don't show NCM. We keep the same layout but replace content.
  const classificationDesc =
    "Clasificación aduanera estimada internamente. Se valida con datos técnicos, origen, uso y requisitos antes de operar.";
  const classificationCode = "—";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización E-Comex</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --ecomex-blue: #1a3a5c;
      --ecomex-light-blue: #2c5282;
      --ecomex-gray: #e2e8f0;
      --ecomex-red: #e53e3e;
      --text-dark: #1a202c;
      --text-light: #718096;
    }
    body { font-family: 'Montserrat', sans-serif; color: var(--ecomex-blue); background: #f0f0f0; }
    .page {
      width: 297mm;
      height: 210mm;
      padding: 15mm 20mm;
      position: relative;
      page-break-after: always;
      background: white;
      margin: 20px auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .page:last-child { page-break-after: auto; }
    .page-cover { display:flex; flex-direction:column; justify-content:center; align-items:center; position:relative; overflow:hidden; }
    .cover-decoration { position:absolute; top:0; right:0; width:50%; height:100%; overflow:hidden; }
    .cover-decoration .shape { position:absolute; background: var(--ecomex-gray); opacity: 0.6; border-radius: 10px; }
    .cover-decoration .shape-1 { width: 140px; height: 45px; top: 30px; right: 250px; }
    .cover-decoration .shape-2 { width: 90px; height: 45px; top: 30px; right: 90px; }
    .cover-decoration .shape-3 { width: 70px; height: 35px; top: 90px; right: 180px; }
    .cover-decoration .shape-4 { width: 120px; height: 40px; top: 90px; right: 30px; }
    .cover-decoration .shape-5 { width: 160px; height: 50px; top: 150px; right: 200px; }
    .cover-decoration .shape-6 { width: 80px; height: 40px; top: 150px; right: 20px; }
    .cover-decoration .shape-7 { width: 100px; height: 45px; top: 210px; right: 120px; }

    .cover-content { text-align:center; z-index:10; margin-top: -30px; }
    .cover-content h1 { font-size: 42px; font-weight: 700; color: var(--ecomex-blue); margin-bottom: 15px; }
    .cover-content h2 { font-size: 28px; font-weight: 500; color: var(--ecomex-blue); margin-bottom: 50px; }
    .cover-content .date { font-size: 18px; color: var(--ecomex-blue); }
    .cover-logo { position:absolute; bottom: 20mm; right: 25mm; }
    .logo { display:flex; align-items:center; gap:12px; }
    .logo-icon { display:flex; flex-direction:column; gap:4px; }
    .logo-icon span { height:5px; background: var(--ecomex-blue); border-radius:3px; }
    .logo-icon span:nth-child(1){ width:30px; } .logo-icon span:nth-child(2){ width:24px; } .logo-icon span:nth-child(3){ width:30px; }
    .logo-text { font-size: 32px; font-weight: 700; color: var(--ecomex-blue); letter-spacing: 1px; }
    .logo-tagline { font-size: 10px; color: var(--ecomex-blue); margin-top: 3px; letter-spacing: 0.5px; }
    .cover-footer { position:absolute; bottom:0; left:0; right:0; background: var(--ecomex-blue); color:white; padding: 12px 25mm; display:flex; justify-content:space-between; align-items:center; font-size: 11px; }
    .cover-footer-item { display:flex; align-items:center; gap:8px; }

    .page-detail { display:flex; flex-direction:column; }
    .detail-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px dashed var(--ecomex-gray); padding-bottom: 12px; margin-bottom: 15px; }
    .detail-header-left { display:flex; gap:50px; }
    .detail-header .rubro { font-size: 13px; }
    .detail-header .rubro strong { color: var(--ecomex-blue); }
    .detail-header .rubro em { font-style: italic; color: var(--ecomex-light-blue); }
    .header-logo { display:flex; align-items:center; gap:8px; }
    .header-logo .logo-icon span { height: 4px; }
    .header-logo .logo-icon span:nth-child(1){ width:22px; } .header-logo .logo-icon span:nth-child(2){ width:18px; } .header-logo .logo-icon span:nth-child(3){ width:22px; }
    .header-logo .logo-text { font-size: 22px; }

    .detail-body { display:flex; gap:25px; flex:1; }
    .detail-images { flex:0.9; display:flex; flex-direction:column; gap:15px; }
    .product-image { width:100%; max-width:260px; height:180px; object-fit:contain; border:1px solid var(--ecomex-gray); border-radius:8px; padding:10px; background:#fafafa; }
    .product-image-placeholder { width:100%; max-width:260px; height:180px; border:2px dashed var(--ecomex-gray); border-radius:8px; display:flex; align-items:center; justify-content:center; color: var(--text-light); font-size:12px; background:#fafafa; text-align:center; padding: 8px; }
    .image-disclaimer { font-size: 10px; color: var(--text-light); font-style: italic; margin-top: 10px; max-width: 260px; }

    .detail-info { flex: 1.1; border-left: 3px solid var(--ecomex-blue); padding-left: 20px; }
    .product-title { font-size: 22px; font-weight: 600; color: var(--ecomex-blue); margin-bottom: 15px; }
    .ncm-description { font-size: 11px; color: var(--text-light); text-align: center; margin-bottom: 10px; line-height: 1.6; }
    .ncm-code { font-size: 12px; font-weight: 700; color: var(--ecomex-blue); text-align: center; margin-bottom: 20px; }

    .cost-breakdown { font-size: 13px; }
    .cost-item { display:flex; justify-content:space-between; padding: 5px 0; }
    .cost-item.main { font-weight: 500; }
    .cost-item.sub { padding-left: 15px; font-size: 11px; color: var(--text-light); }
    .cost-item.sub .label::before { content: "•"; margin-right: 6px; color: var(--ecomex-blue); }
    .cost-item.iva-highlight { color: var(--ecomex-red); font-weight: 500; }
    .cost-item.total { font-weight: 700; font-size: 15px; border-top: 2px solid var(--ecomex-blue); margin-top: 8px; padding-top: 8px; }
    .cost-item.iva-total { color: var(--ecomex-red); font-weight: 600; }
    .cost-item.grand-total { font-weight: 700; font-size: 16px; }

    .page-items { display:flex; flex-direction:column; }
    .items-table { width:100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
    .items-table th { background: var(--ecomex-blue); color:white; padding: 10px 12px; text-align:left; font-weight:600; font-size: 11px; }
    .items-table th:not(:first-child) { text-align:right; }
    .items-table td { padding: 8px 12px; border-bottom: 1px solid var(--ecomex-gray); }
    .items-table td:not(:first-child) { text-align:right; }
    .items-table tr:nth-child(even) { background: #f8fafc; }
    .items-table tr.total-row { background: var(--ecomex-blue); color:white; font-weight:700; }
    .items-table tr.total-row td { border-bottom:none; padding: 12px; }

    .page-observations { display:flex; flex-direction:column; }
    .observations-title { font-size: 16px; font-weight: 700; color: var(--ecomex-blue); text-decoration: underline; margin-bottom: 25px; margin-top: 50px; }
    .observations-content { font-size: 13px; line-height: 2; color: var(--text-dark); }
    .observations-content p { margin-bottom: 12px; }
    .observations-content strong { color: var(--ecomex-blue); }

    /* ==================== PRINT STYLES ==================== */
    @media print {
      body { background: white; }
      .page {
        margin: 0;
        box-shadow: none;
        page-break-after: always;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    @page { size: A4 landscape; margin: 0; }
  </style>
</head>
<body>
  <div class="page page-cover">
    <div class="cover-decoration">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
      <div class="shape shape-4"></div>
      <div class="shape shape-5"></div>
      <div class="shape shape-6"></div>
      <div class="shape shape-7"></div>
    </div>

    <div class="cover-content">
      <h1>Rubro: ${htmlEscape(rubro)}</h1>
      <h2>Producto: ${htmlEscape(productos)}</h2>
      <p class="date">${htmlEscape(date)}</p>
    </div>

    <div class="cover-logo">
      <div class="logo">
        <div class="logo-icon">
          <span></span><span></span><span></span>
        </div>
        <div>
          <div class="logo-text">E-COMEX</div>
          <div class="logo-tagline">La Evolución del Comercio Exterior</div>
        </div>
      </div>
    </div>

    <div class="cover-footer">
      <div class="cover-footer-item"><span>✉</span><span>info@e-comex.com.ar</span></div>
      <div class="cover-footer-item"><span>📱</span><span>(+54) 115353 0536</span></div>
      <div class="cover-footer-item"><span>🌐</span><span>www.e-comex.com.ar</span></div>
      <div class="cover-footer-item"><span>📍</span><span>Av. Pres. Julio Roca 771, 7mo 12, CABA, Bs. As., Argentina</span></div>
    </div>
  </div>

  <div class="page page-detail">
    <div class="detail-header">
      <div class="detail-header-left">
        <div class="rubro"><strong>Rubro:</strong> <em>${htmlEscape(rubro)}</em></div>
        <div class="rubro"><strong>Productos:</strong> <em>${htmlEscape(productos)}</em></div>
      </div>
      <div class="header-logo">
        <div class="logo-icon"><span></span><span></span><span></span></div>
        <div class="logo-text">E-COMEX</div>
      </div>
    </div>

    <div class="detail-body">
      <div class="detail-images">
        ${renderProductImages(product)}
        <p class="image-disclaimer">Las imágenes pueden diferir levemente respecto del producto final.</p>
      </div>

      <div class="detail-info">
        <h2 class="product-title">${htmlEscape(title)}</h2>

        <div class="ncm-description">${htmlEscape(classificationDesc)}</div>
        <div class="ncm-code">${htmlEscape(classificationCode)}</div>

        <div class="cost-breakdown">
          <div class="cost-item main"><span class="label">FOB:</span><span class="value">${costs.fobTotal != null ? fmtUsdEs(costs.fobTotal) : "—"}</span></div>
          <div class="cost-item main"><span class="label">Flete marítimo internacional:</span><span class="value">${costs.flete != null ? fmtUsdEs(costs.flete) : "—"}</span></div>
          <div class="cost-item main"><span class="label">Seguro internacional:</span><span class="value">${costs.seguro != null ? fmtUsdEs(costs.seguro) : "—"}</span></div>
          <div class="cost-item main"><span class="label">Tributos aduaneros a pagar:</span><span class="value">${costs.impuestos != null ? fmtUsdEs(costs.impuestos) : "—"}</span></div>
          <div class="cost-item sub"><span class="label">Derechos de importación:</span><span class="value">Incluido</span></div>
          <div class="cost-item sub"><span class="label">Tasa de Estadística:</span><span class="value">Incluido</span></div>
          <div class="cost-item sub iva-highlight"><span class="label">I.V.A.:</span><span class="value">Incluido</span></div>
          <div class="cost-item sub"><span class="label">Arancel SIM:</span><span class="value">Incluido</span></div>
          <div class="cost-item main"><span class="label">Honorarios:</span><span class="value">${costs.honorarios != null ? fmtUsdEs(costs.honorarios) : "—"}</span></div>
          <div class="cost-item main"><span class="label">Gastos de depósito y portuarios:</span><span class="value">${costs.deposito != null ? fmtUsdEs(costs.deposito) : "—"}</span></div>
          <div class="cost-item main"><span class="label">Gastos transporte nacional:</span><span class="value">${costs.transporteNac != null ? fmtUsdEs(costs.transporteNac) : "—"}</span></div>
          <div class="cost-item main"><span class="label">Gastos transferencia intl:</span><span class="value">${costs.transferencia != null ? fmtUsdEs(costs.transferencia) : "—"}</span></div>
          <div class="cost-item total"><span class="label">TOTAL:</span><span class="value">${totalToShow != null ? fmtUsdEs(totalToShow) : "—"}</span></div>
          <div class="cost-item iva-total"><span class="label">IVA:</span><span class="value">—</span></div>
          <div class="cost-item grand-total"><span class="label">TOTAL A PAGAR:</span><span class="value">${totalToPay != null ? fmtUsdEs(totalToPay) : "—"}</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="page page-items">
    <div class="detail-header">
      <div class="detail-header-left">
        <div class="rubro"><strong>Rubro:</strong> <em>${htmlEscape(rubro)}</em></div>
        <div class="rubro"><strong>Productos:</strong> <em>${htmlEscape(productos)}</em></div>
      </div>
      <div class="header-logo">
        <div class="logo-icon"><span></span><span></span><span></span></div>
        <div class="logo-text">E-COMEX</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Ítem</th>
          <th>Cantidad (unidad)</th>
          <th>Precio FOB x ítem USD</th>
          <th>Costo final x ítem USD</th>
          <th>Costo final unitario USD x unidad</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>ITEM-01</td>
          <td>${costs.qty}</td>
          <td>${costs.fobUnit != null ? fmtUsdEs(costs.fobUnit) : "—"}</td>
          <td>${totalToShow != null ? fmtUsdEs(totalToShow) : "—"}</td>
          <td>${
            totalToShow != null ? fmtUsdEs(totalToShow / Math.max(1, costs.qty)) : "—"
          }</td>
        </tr>
        <tr class="total-row">
          <td>TOTAL</td>
          <td>${costs.qty}</td>
          <td>${costs.fobTotal != null ? fmtUsdEs(costs.fobTotal) : "—"}</td>
          <td>${totalToShow != null ? fmtUsdEs(totalToShow) : "—"}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="page page-observations">
    <div class="detail-header">
      <div class="detail-header-left">
        <div class="rubro"><strong>Rubro:</strong> <em>${htmlEscape(rubro)}</em></div>
        <div class="rubro"><strong>Productos:</strong> <em>${htmlEscape(productos)}</em></div>
      </div>
      <div class="header-logo">
        <div class="logo-icon"><span></span><span></span><span></span></div>
        <div class="logo-text">E-COMEX</div>
      </div>
    </div>

    <h3 class="observations-title">Observaciones</h3>
    <div class="observations-content">
      <p>• Todos los gastos son cotizados en dólares estadounidenses.</p>
      <p>Al momento del pago (1) se toma el tipo de cambio informal o blue para realizar el pago al proveedor en origen de forma anticipada.</p>
      <p>Al momento del pago (2) se toma el tipo de cambio oficial vendedor del banco Nación para realizar los pagos en pesos argentinos por transferencia bancaria.</p>
      <p><strong>• Los pagos se realizan en dos partes:</strong></p>
      <p>1. Se abona el precio del producto más los gastos bancarios. Este pago es inicial para poder transferir el monto al proveedor en origen.</p>
      <p>2. Una vez que la carga llega al país, se abona el resto según el análisis enviado.</p>
      <p><strong>Importante:</strong> este reporte es orientativo. La validación profesional (clasificación aduanera, requisitos/intervenciones y documentación) es el paso final antes de operar.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function generateQuotePdfViaHtml(quote: QuoteLike) {
  // Render with Playwright for pixel-perfect output.
  process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || "0";
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });
    const html = renderQuotePdfHtml(quote);
    // Be resilient in production: external images/fonts can prevent "networkidle".
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    await page.emulateMedia({ media: "print" });
    // Wait for web fonts (best-effort).
    await page
      .evaluate(async () => {
        // @ts-ignore
        if (document.fonts?.ready) {
          // @ts-ignore
          await document.fonts.ready;
        }
      })
      .catch(() => null);
    // Best-effort: give images a short chance to render.
    await page
      .evaluate(async () => {
        const imgs = Array.from(document.images || []);
        const waitImg = (img: HTMLImageElement) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                const done = () => resolve();
                img.addEventListener("load", done, { once: true });
                img.addEventListener("error", done, { once: true });
              });
        await Promise.race([
          Promise.all(imgs.slice(0, 6).map(waitImg)),
          new Promise<void>((r) => setTimeout(r, 2000)),
        ]);
      })
      .catch(() => null);
    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      preferCSSPageSize: true,
    });
    return pdf;
  } finally {
    await browser.close().catch(() => null);
  }
}

