import { PDFParse } from "pdf-parse";
import * as XLSX from "xlsx";

const MAX_TEXT_PER_FILE = 120_000;

async function extractPdfText(buf: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buf });
  try {
    const res = await parser.getText();
    return res.text ?? "";
  } finally {
    await parser.destroy();
  }
}

function extractXlsxText(buf: Buffer): string {
  const wb = XLSX.read(buf, { type: "buffer" });
  const parts: string[] = [];
  for (const name of wb.SheetNames.slice(0, 5)) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: "\t" });
    parts.push(`--- Hoja: ${name} ---\n${csv}`);
  }
  return parts.join("\n\n");
}

async function extractImageInvoiceText(buf: Buffer, mime: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error(
      "OPENAI_API_KEY es necesario para leer facturas en imagen (PNG/JPG/WebP)."
    );
  }
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const b64 = buf.toString("base64");
  const dataUrl = `data:${mime || "image/jpeg"};base64,${b64}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            "Sos un asistente que transcribe documentos comerciales. Extraé todo el texto legible: ítems, cantidades, precios, moneda, descripciones de producto, datos del proveedor. Respondé solo con texto plano en español, sin markdown.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Transcribí el contenido de esta factura o proforma.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message ?? `OpenAI ${res.status}`;
    throw new Error(msg);
  }
  const text = String(json?.choices?.[0]?.message?.content ?? "").trim();
  return text || "(sin texto detectado)";
}

export type InvoiceExtractPart = {
  filename: string;
  text: string;
  error?: string;
};

/**
 * Extrae texto de un archivo de factura/proforma (PDF, Excel, imagen).
 */
export async function extractTextFromInvoiceFile(file: File): Promise<InvoiceExtractPart> {
  const filename = file.name || "archivo";
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = (file.type || "").toLowerCase();
  const lower = filename.toLowerCase();

  try {
    if (mime === "application/pdf" || lower.endsWith(".pdf")) {
      const raw = await extractPdfText(buf);
      const text = raw.trim() || "(PDF sin texto extraíble)";
      return { filename, text: text.slice(0, MAX_TEXT_PER_FILE) };
    }

    if (
      mime.includes("spreadsheet") ||
      mime.includes("excel") ||
      lower.endsWith(".xlsx") ||
      lower.endsWith(".xls")
    ) {
      const text = extractXlsxText(buf);
      return { filename, text: text.trim().slice(0, MAX_TEXT_PER_FILE) || "(hoja vacía)" };
    }

    if (mime.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(lower)) {
      const imageMime =
        mime.startsWith("image/") ? mime : lower.endsWith(".png") ? "image/png" : "image/jpeg";
      const text = await extractImageInvoiceText(buf, imageMime);
      return { filename, text: text.slice(0, MAX_TEXT_PER_FILE) };
    }

    return { filename, text: "", error: `Formato no soportado (${filename}). Usá PDF, Excel o imagen.` };
  } catch (e) {
    return {
      filename,
      text: "",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Varios archivos: bloques separados para enviar al modelo de chat.
 */
export async function extractInvoiceTextsMerged(files: File[]): Promise<string> {
  const parts: string[] = [];
  for (const f of files) {
    const r = await extractTextFromInvoiceFile(f);
    if (r.error) {
      parts.push(`--- ${r.filename} ---\n[Error al leer: ${r.error}]\n`);
    } else {
      parts.push(`--- ${r.filename} ---\n${r.text}\n`);
    }
  }
  return parts.join("\n").trim();
}

/**
 * Inserta el texto extraído en el mensaje del usuario conservando notas/contexto previo.
 */
export function stitchInvoiceIntoUserMessage(originalUserContent: string, extractedBlock: string): string {
  const original = String(originalUserContent ?? "").trim();
  const block = extractedBlock.slice(0, 500_000);
  const header =
    "[FACTURA / DOCUMENTO ADJUNTO — texto extraído automáticamente]\n" +
    "(Usá esta información para identificar producto, precios, cantidades y origen.)\n\n";

  if (!original || original.startsWith("[SOURCE_INVOICE]")) {
    return `${header}${block}`;
  }

  return `${header}${block}\n\n---\nContexto adicional del usuario:\n${original}`;
}
