import "dotenv/config";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { generateQuotePdf } from "@/lib/pdf/quotePdf";

export const runtime = "nodejs";

function safeMode(m: string | null) {
  return m === "budget" ? "budget" : "quote";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = safeMode(url.searchParams.get("mode"));
  const id = url.searchParams.get("id");

  const cookieStore = await cookies();
  const anonId = cookieStore.get("ecomex_anon")?.value;
  if (!anonId) {
    return NextResponse.json(
      { error: "Sesión no encontrada. Abrí el chat y generá una cotización primero." },
      { status: 401 }
    );
  }

  const quote = await prisma.quote
    .findFirst({
      where: id
        ? { id, anonId, mode }
        : {
            anonId,
            mode,
            totalMinUsd: { not: null },
            totalMaxUsd: { not: null },
          },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null);

  if (!quote) {
    return NextResponse.json(
      { error: "No encontré un presupuesto para descargar. Generá uno en el chat." },
      { status: 404 }
    );
  }

  const pdfBytes = await generateQuotePdf({ quote: quote as any });
  const filename =
    mode === "budget" ? "E-COMEX - Presupuesto.pdf" : "E-COMEX - Cotizacion.pdf";

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

