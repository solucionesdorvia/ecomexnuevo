import "dotenv/config";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { generateQuotePdf } from "@/lib/pdf/quotePdf";
import { writeAuditLog } from "@/lib/audit/log";
import { verifyAuthToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";

function safeMode(m: string | null) {
  return m === "budget" ? "budget" : "quote";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = safeMode(url.searchParams.get("mode"));
  const id = url.searchParams.get("id");

  const cookieStore = await cookies();
  const anonFromQuery = (url.searchParams.get("anon") ?? "").trim();
  const anonId = cookieStore.get("ecomex_anon")?.value || anonFromQuery;

  const authToken = cookieStore.get("ecomex_auth")?.value;
  const auth = authToken ? await verifyAuthToken(authToken) : null;
  const userId = auth?.sub ?? null;

  if (!anonId && !userId) {
    return NextResponse.json(
      { error: "Sesión no encontrada. Abrí el análisis y generá una cotización primero." },
      { status: 401 }
    );
  }

  const where = id
    ? userId
      ? { id, mode, OR: [{ userId }, ...(anonId ? [{ anonId }] : [])] }
      : { id, anonId, mode }
    : userId
      ? { userId, mode, totalMinUsd: { not: null }, totalMaxUsd: { not: null } }
      : { anonId, mode, totalMinUsd: { not: null }, totalMaxUsd: { not: null } };

  const quote = await prisma.quote
    .findFirst({
      where: where as any,
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);

  if (!quote) {
    return NextResponse.json(
      { error: "No encontré un presupuesto para descargar. Generá uno en el análisis." },
      { status: 404 }
    );
  }

  const out = await generateQuotePdf({ quote: quote as any });
  const filename =
    mode === "budget" ? "E-COMEX - Presupuesto.pdf" : "E-COMEX - Cotizacion.pdf";

  await writeAuditLog({
    entityType: "quote",
    entityId: quote.id,
    action: "export_pdf",
    quoteId: quote.id,
    payload: { mode, renderer: out.renderer },
  });

  return new NextResponse(Buffer.from(out.bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      "x-ecomex-pdf-renderer": out.renderer,
    },
  });
}

