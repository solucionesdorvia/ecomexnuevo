import { NextResponse } from "next/server";
import { processClasificarTurn } from "@/lib/clasificar-ncm/chatEngine";
import { rateLimitByIp } from "@/lib/rateLimit";
import type { CaseSnapshot, ChatMessage } from "@/lib/clasificar-ncm/types";

export const runtime = "nodejs";

const MAX_MESSAGES = 80;
const MAX_MSG_LEN = 12_000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_FILES = 4;
const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB

export async function POST(req: Request) {
  const rl = rateLimitByIp(req, "clasificar-chat", 30, HOUR_MS);
  if (!rl.ok) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intentá en unos minutos." }, { status: 429 });
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let messages: unknown[] = [];
    let snapshot: unknown = null;

    if (contentType.includes("multipart/form-data")) {
      // ── Multipart: JSON body + optional invoice files ──────────────────
      const form = await req.formData();
      const jsonRaw = form.get("json");
      if (typeof jsonRaw !== "string") {
        return NextResponse.json({ error: "Falta el campo json en el formulario." }, { status: 400 });
      }
      let parsed: { messages?: unknown; snapshot?: unknown };
      try {
        parsed = JSON.parse(jsonRaw) as typeof parsed;
      } catch {
        return NextResponse.json({ error: "JSON inválido en el formulario." }, { status: 400 });
      }
      messages = Array.isArray(parsed.messages) ? parsed.messages : [];
      snapshot = parsed.snapshot ?? null;

      // Extract text from attached files and stitch into last user message
      const invoiceFiles = form
        .getAll("invoice")
        .filter((x): x is File => x instanceof File && x.size > 0)
        .slice(0, MAX_FILES);

      if (invoiceFiles.length > 0) {
        for (const f of invoiceFiles) {
          if (f.size > MAX_FILE_BYTES) {
            return NextResponse.json(
              { error: `El archivo "${f.name}" supera el límite de 12 MB.` },
              { status: 400 }
            );
          }
        }

        const { extractInvoiceTextsMerged, stitchInvoiceIntoUserMessage } = await import(
          "@/lib/invoice/extractTextFromInvoiceFile"
        );

        const extracted = await extractInvoiceTextsMerged(invoiceFiles);

        // Stitch extracted text into the last user message
        const lastIdx = messages.length - 1;
        const last = messages[lastIdx] as ChatMessage | undefined;
        if (last?.role === "user" && typeof last.content === "string") {
          (messages[lastIdx] as ChatMessage).content = stitchInvoiceIntoUserMessage(
            last.content === "(archivos adjuntos)" ? "" : last.content,
            extracted
          );
        }
      }
    } else {
      // ── JSON only ──────────────────────────────────────────────────────
      const body = (await req.json().catch(() => null)) as {
        messages?: unknown;
        snapshot?: unknown;
      } | null;
      messages = Array.isArray(body?.messages) ? body!.messages : [];
      snapshot = body?.snapshot ?? null;
    }

    if (!messages.length) {
      return NextResponse.json({ error: "Falta historial de mensajes." }, { status: 400 });
    }
    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json({ error: "Historial demasiado largo." }, { status: 400 });
    }
    for (const m of messages) {
      if (typeof (m as ChatMessage)?.content === "string" && (m as ChatMessage).content.length > MAX_MSG_LEN) {
        return NextResponse.json({ error: "Mensaje demasiado largo." }, { status: 400 });
      }
    }

    const typedMessages = messages as ChatMessage[];
    const snap = (snapshot ?? { status: "idle" }) as CaseSnapshot;

    const { assistantMessage, snapshot: outSnap } = await processClasificarTurn({
      messages: typedMessages,
      snapshot: snap,
    });

    return NextResponse.json({ assistantMessage, snapshot: outSnap });
  } catch (e) {
    console.error("[clasificar-ncm/chat] error", e);
    return NextResponse.json(
      { error: "No se pudo procesar el mensaje. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
