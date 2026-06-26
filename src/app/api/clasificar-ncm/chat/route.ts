import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { processClasificarTurn } from "@/lib/clasificar-ncm/chatEngine";
import { rateLimitByIp } from "@/lib/rateLimit";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import type { ImporterProfile } from "@/lib/importer/importerProfile";
import type { CaseSnapshot, ChatMessage } from "@/lib/clasificar-ncm/types";

/**
 * Carga el perfil de importador del usuario logueado (Fase 0.b) para inyectarlo
 * al contexto del analista. Best-effort: si no hay sesión o falla, devuelve null
 * (los usuarios anónimos cotizan sin perfil, como hasta ahora).
 */
async function loadImporterProfile(): Promise<ImporterProfile | null> {
  const session = await getSessionUser().catch(() => null);
  if (!session) return null;
  const u = await prisma.user
    .findUnique({
      where: { id: session.id },
      select: { importerProfile: true, taxId: true, iibbProvince: true, fiscalBenefits: true },
    })
    .catch(() => null);
  if (!u) return null;
  return {
    importerProfile: (u.importerProfile as ImporterProfile["importerProfile"]) ?? null,
    taxId: u.taxId ?? null,
    iibbProvince: u.iibbProvince ?? null,
    fiscalBenefits: (u.fiscalBenefits as ImporterProfile["fiscalBenefits"]) ?? [],
  };
}

export const runtime = "nodejs";

const MAX_MESSAGES = 80;
const MAX_MSG_LEN = 12_000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_FILES = 4;
const MAX_FILE_BYTES = 12 * 1024 * 1024; // 12 MB
// 30/h era muy bajo para un importador que clasifica varios productos seguidos
// (peor aún detrás de una IP de oficina/NAT). Configurable por env.
const CHAT_RATE_MAX = Number(process.env.RATE_LIMIT_CHAT_MAX) || 120;

export async function POST(req: Request) {
  const rl = rateLimitByIp(req, "clasificar-chat", CHAT_RATE_MAX, HOUR_MS);
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

    // ── Link de publicación: si el último mensaje trae una URL, scrapeamos el
    // producto y lo agregamos al texto (igual que con las facturas). Si no se
    // puede leer, marcamos para que el analista pida una captura + nombre.
    try {
      const lastIdx = messages.length - 1;
      const last = messages[lastIdx] as ChatMessage | undefined;
      if (last?.role === "user" && typeof last.content === "string") {
        const { extractUrl } = await import("@/lib/chat/chatParsers");
        const url = extractUrl(last.content);
        const already = /\[PRODUCTO DEL LINK\]|\[LINK NO LEÍDO\]/.test(last.content);
        if (url && !already) {
          const { scrapeProductFromUrl } = await import("@/lib/scraper/scrapeProductFromUrl");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = (await scrapeProductFromUrl(url, { hintText: last.content, timeoutMs: 20_000 }).catch(() => null)) as any;
          const title = String(p?.displayTitle || p?.title || "").trim();
          const failed =
            !p || p?.raw?.scrapeFailed || !title || /^producto desde /i.test(title) || /^https?:/i.test(title);
          if (!failed) {
            const parts = [`[PRODUCTO DEL LINK]`, `Título: ${title}`];
            const amount = p?.price?.amount;
            if (amount) parts.push(`Precio publicado: ${amount} ${p?.price?.currency ?? ""}`.trim());
            (messages[lastIdx] as ChatMessage).content = `${last.content}\n\n${parts.join("\n")}`;
          } else {
            (messages[lastIdx] as ChatMessage).content =
              `${last.content}\n\n[LINK NO LEÍDO: no se pudo leer el producto desde ese link. Pedile al usuario una foto/captura del producto y su nombre. No inventes ni clasifiques el producto hasta tenerlo.]`;
          }
        }
      }
    } catch {
      // best-effort: el scraping nunca bloquea el chat
    }

    const typedMessages = messages as ChatMessage[];
    const snap = (snapshot ?? { status: "idle" }) as CaseSnapshot;

    const importerProfile = await loadImporterProfile();

    const { assistantMessage, snapshot: outSnap } = await processClasificarTurn({
      messages: typedMessages,
      snapshot: snap,
      importerProfile,
    });

    // ── Transcripción para el panel del DUEÑO (best-effort, no bloquea) ───────
    // Guardamos la conversación en AuditLog (sin migración) vinculada por anonId
    // —la misma clave con la que se guardan cotizaciones y leads— para poder
    // cruzar "qué chateó" ↔ "qué cotizó" ↔ "dejó contacto".
    const cookieStore = await cookies();
    const existingAnon = cookieStore.get("ecomex_anon")?.value;
    const anonId = existingAnon && existingAnon.length >= 8 ? existingAnon : crypto.randomUUID();
    const fullMessages = [...typedMessages, { role: "assistant" as const, content: assistantMessage }];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transcriptPayload: any = {
      anonId,
      messages: fullMessages.slice(-40),
      status: outSnap.status ?? null,
      ncm: outSnap.recommendedNcm ?? null,
      productName: outSnap.productName ?? outSnap.technicalName ?? null,
      purchase: outSnap.purchase ?? null,
      turns: fullMessages.filter((m) => m.role === "user").length,
    };
    void prisma.auditLog
      .create({
        data: { entityType: "chat_transcript", entityId: anonId, action: "turn", payload: transcriptPayload },
      })
      .catch(() => {});

    const res = NextResponse.json({ assistantMessage, snapshot: outSnap });
    res.cookies.set("ecomex_anon", anonId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch (e) {
    console.error("[clasificar-ncm/chat] error", e);
    return NextResponse.json(
      { error: "No se pudo procesar el mensaje. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
