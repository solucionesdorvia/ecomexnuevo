import "dotenv/config";

import { NextResponse } from "next/server";
import { LocalNomenclator } from "@/lib/nomenclator/localNomenclator";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const hs = url.searchParams.get("hs") ?? undefined;
  if (!q.trim()) {
    return NextResponse.json(
      { ok: false, error: "Missing q. Example: /api/debug/nomenclator?q=autoelevador" },
      { status: 400 }
    );
  }

  try {
    const nom = new LocalNomenclator({
      path: process.env.NOMENCLATOR_DB_PATH ?? "nomenclator.db",
    });
    const results = nom.search(q, { limit: 15, hsHeading: hs || undefined });
    return NextResponse.json({ ok: true, q, hs, count: results.length, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

