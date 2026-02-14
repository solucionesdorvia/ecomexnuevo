import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs/promises";
import path from "node:path";
import { generateQuotePdfViaHtml } from "@/lib/pdf/quoteHtml";

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

type QuoteCard = {
  label: string;
  value: string;
  detail?: string;
  highlight?: boolean;
};

function fmtDate(d: Date) {
  try {
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function safeStr(x: unknown) {
  return String(x ?? "").trim();
}

function pdfSafeText(x: unknown) {
  // Standard PDF fonts (WinAnsi) can't encode some punctuation like U+2011/U+2013.
  return safeStr(x)
    .replace(/\u2011/g, "-") // non-breaking hyphen
    .replace(/[\u2013\u2014\u2212]/g, "-") // en dash/em dash/minus
    .replace(/\u00a0/g, " "); // nbsp
}

function getCards(quoteJson: any): QuoteCard[] {
  const cards = Array.isArray(quoteJson?.cards) ? quoteJson.cards : [];
  return cards
    .map((c: any) => ({
      label: pdfSafeText(c?.label),
      value: pdfSafeText(c?.value),
      detail: c?.detail ? pdfSafeText(c.detail) : undefined,
      highlight: Boolean(c?.highlight),
    }))
    .filter((c: QuoteCard) => c.label && c.value);
}

async function tryFillTemplate(params: {
  templatePath: string;
  reportId: string;
  productTitle: string;
  totalText: string;
  modeLabel: string;
  createdAt: Date;
  cards: QuoteCard[];
}) {
  const abs = path.isAbsolute(params.templatePath)
    ? params.templatePath
    : path.join(process.cwd(), params.templatePath);

  const bytes = await fs.readFile(abs).catch(() => null);
  if (!bytes) return null;

  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true }).catch(
    () => null
  );
  if (!pdfDoc) return null;

  // If the template has AcroForm fields, we fill by name.
  // If fields are missing, we silently skip.
  try {
    const form = pdfDoc.getForm();
    const setText = (name: string, value: string) => {
      try {
        const f = form.getTextField(name);
        f.setText(value);
      } catch {
        // ignore
      }
    };

    setText("report_id", params.reportId);
    setText("product_title", params.productTitle);
    setText("total_text", params.totalText);
    setText("mode", params.modeLabel);
    setText("date", fmtDate(params.createdAt));

    // Up to 8 cards
    params.cards.slice(0, 8).forEach((c, i) => {
      setText(`card_${i + 1}_label`, c.label);
      setText(`card_${i + 1}_value`, c.value);
      if (c.detail) setText(`card_${i + 1}_detail`, c.detail);
    });

    form.flatten();
  } catch {
    // Template might not have a form. We'll just return it unchanged.
  }

  return await pdfDoc.save();
}

export async function generateQuotePdf(params: {
  quote: QuoteLike;
  templatePath?: string;
}): Promise<{ bytes: Uint8Array; renderer: "html" | "template" | "pdflib" }> {
  const q: any = params.quote;

  // Prefer HTML→PDF (pixel-perfect template) and fallback to pdf-lib if it fails.
  const htmlPdf = await generateQuotePdfViaHtml(q as any).catch((e) => {
    // Railway/default Node images often can't run Chromium without the right deps.
    // We log so it's diagnosable, but we still fallback to keep the endpoint working.
    // eslint-disable-next-line no-console
    console.error("[pdf] HTML→PDF failed; falling back to pdf-lib.", e);
    return null;
  });
  if (htmlPdf && htmlPdf.byteLength) return { bytes: htmlPdf, renderer: "html" };

  const quoteJson: any = q.quoteJson ?? {};
  const productTitle =
    pdfSafeText((q.productJson as any)?.title) || pdfSafeText(q.userText) || "Presupuesto";
  const cards = getCards(quoteJson);
  const totalCard =
    cards.find((c) => /total puesto en argentina/i.test(c.label)) ??
    cards.find((c) => /total/i.test(c.label)) ??
    null;

  const reportId = `COMEX-${pdfSafeText(q.id).slice(-6).toUpperCase()}`;
  const modeLabel = q.mode === "budget" ? "Presupuesto" : "Cotización";
  const totalText =
    pdfSafeText(totalCard?.value) ||
    (q.totalMinUsd != null && q.totalMaxUsd != null
      ? `USD ${q.totalMinUsd.toFixed(0)} - USD ${q.totalMaxUsd.toFixed(0)}`
      : "—");

  const templatePath =
    params.templatePath ||
    process.env.QUOTE_PDF_TEMPLATE_PATH ||
    "public/templates/quote-template.pdf";

  const fromTemplate = await tryFillTemplate({
    templatePath,
    reportId,
    productTitle,
    totalText,
    modeLabel,
    createdAt: q.createdAt,
    cards,
  }).catch(() => null);

  if (fromTemplate) return { bytes: fromTemplate, renderer: "template" };

  // Fallback: generate a clean PDF programmatically (no external assets).
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const primary = rgb(0.0588, 0.286, 0.741); // #0f49bd
  const gold = rgb(0.831, 0.686, 0.216); // #d4af37
  const slate = rgb(0.18, 0.2, 0.24);

  const margin = 46;
  let y = 800;

  // Header
  page.drawText("E-COMEX", {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: primary,
  });
  page.drawText(pdfSafeText("Quote Summary Report"), {
    x: margin + 92,
    y: y + 2,
    size: 11,
    font,
    color: slate,
  });

  y -= 24;
  page.drawText(
    pdfSafeText(`ID: ${reportId} • ${fmtDate(q.createdAt)} • ${modeLabel}`),
    {
    x: margin,
    y,
    size: 10,
    font,
    color: slate,
    }
  );

  y -= 26;
  page.drawText(pdfSafeText(productTitle), {
    x: margin,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  y -= 18;
  page.drawText(
    pdfSafeText("Reporte orientativo generado automáticamente (requiere validación profesional)."),
    { x: margin, y, size: 10, font, color: slate }
  );

  // Total box
  y -= 46;
  page.drawRectangle({
    x: margin,
    y: y - 44,
    width: 595.28 - margin * 2,
    height: 60,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: gold,
    borderWidth: 1,
  });
  page.drawText("TOTAL ESTIMADO (rango)", {
    x: margin + 14,
    y: y + 2,
    size: 9,
    font: fontBold,
    color: slate,
  });
  page.drawText(pdfSafeText(totalText), {
    x: margin + 14,
    y: y - 24,
    size: 18,
    font: fontBold,
    color: gold,
  });

  // Cards list
  y -= 84;
  page.drawText(pdfSafeText("Desglose"), {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: slate,
  });
  y -= 18;

  const rowH = 18;
  const maxRows = 18;
  const items = cards.slice(0, maxRows);
  for (const c of items) {
    if (y < 120) break;
    page.drawText(pdfSafeText(c.label), {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: slate,
    });
    page.drawText(pdfSafeText(c.value), {
      x: 340,
      y,
      size: 10,
      font: fontBold,
      color: c.highlight ? gold : slate,
    });
    y -= rowH;
    if (c.detail) {
      const d = c.detail.length > 110 ? `${c.detail.slice(0, 110)}…` : c.detail;
      page.drawText(pdfSafeText(d), { x: margin, y, size: 9, font, color: slate });
      y -= 14;
    }
  }

  // Disclaimer
  const disclaimer =
    "Este presupuesto es preliminar. La viabilidad final depende de validaciones técnicas, regulatorias y operativas (clasificación aduanera, intervenciones, documentación, peso/volumen real y condición fiscal).";
  page.drawText(pdfSafeText(disclaimer), {
    x: margin,
    y: 66,
    size: 8.5,
    font,
    color: slate,
    maxWidth: 595.28 - margin * 2,
    lineHeight: 11,
  });

  return { bytes: await pdf.save(), renderer: "pdflib" };
}

