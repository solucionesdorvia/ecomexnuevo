import { NextResponse } from "next/server";
import { processClasificarTurn } from "@/lib/clasificar-ncm/chatEngine";
import { rateLimitByIp } from "@/lib/rateLimit";
import type { CaseSnapshot, ChatMessage } from "@/lib/clasificar-ncm/types";

export const runtime = "nodejs";

const MAX_MESSAGES = 80;
const MAX_MSG_LEN = 12_000;
const HOUR_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  const rl = rateLimitByIp(req, "clasificar-chat", 30, HOUR_MS);
  if (!rl.ok) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Intentá en unos minutos." }, { status: 429 });
  }

  try {
    const body = (await req.json().catch(() => null)) as {
      messages?: unknown;
      snapshot?: unknown;
    } | null;

    const messages = Array.isArray(body?.messages) ? body!.messages : [];
    const snapshot = body?.snapshot && typeof body.snapshot === "object" ? body!.snapshot : null;

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

    return NextResponse.json({
      assistantMessage,
      snapshot: outSnap,
    });
  } catch (e) {
    console.error("[clasificar-ncm/chat] error", e);
    return NextResponse.json(
      { error: "No se pudo procesar el mensaje. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
