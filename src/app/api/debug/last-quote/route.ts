import "dotenv/config";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

function parseCookies(header: string | null) {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available in production." }, { status: 404 });
  }

  const cookieHeader = req.headers.get("cookie");
  const cookieMap = parseCookies(cookieHeader);
  const anonId = cookieMap["ecomex_anon"];
  if (!anonId) {
    return NextResponse.json(
      { ok: false, error: "No hay cookie ecomex_anon en esta sesión." },
      { status: 400 }
    );
  }

  const last = await prisma.quote.findFirst({
    where: { anonId, mode: "quote" },
    orderBy: { createdAt: "desc" },
  });

  if (!last) {
    return NextResponse.json(
      { ok: false, error: "No encontré cotizaciones previas para esta sesión." },
      { status: 404 }
    );
  }

  const product: any = (last.productJson as any) ?? {};
  const raw: any = product?.raw ?? {};
  const pcram: any = raw?.pcram ?? {};

  const ncmUsed =
    (typeof product?.ncm === "string" && product.ncm.trim()) ||
    (typeof pcram?.ncmCode === "string" && pcram.ncmCode.trim()) ||
    null;

  return NextResponse.json({
    ok: true,
    anonId,
    quoteId: last.id,
    createdAt: last.createdAt,
    stage: last.stage,
    title: typeof product?.title === "string" ? product.title : null,
    ncmUsed,
    hasPcram: Boolean(raw?.pcram),
    ncmMeta: raw?.ncmMeta ?? null,
  });
}

