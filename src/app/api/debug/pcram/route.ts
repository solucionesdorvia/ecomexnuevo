import "dotenv/config";
import { NextResponse } from "next/server";
import { PcramClient } from "@/lib/pcram/pcramClient";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ncm = url.searchParams.get("ncm") ?? "8704.21.10";
  const refresh = url.searchParams.get("refresh") === "1";

  try {
    const client = new PcramClient();
    const detail = await client.getDetail(ncm, { bypassCache: refresh });
    return NextResponse.json({
      ok: true,
      ncm: detail.ncmCode,
      title: detail.title ?? null,
      taxes: detail.taxes,
      internalTaxes: detail.internalTaxes ?? null,
      interventionsCount: detail.interventions.length,
      reclassificationsCount: detail.reclassifications.length,
      source: detail.source,
      dumpedHtml: (process.env.PCRAM_DUMP_HTML ?? "").toLowerCase() === "true",
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        dumpedHtml: (process.env.PCRAM_DUMP_HTML ?? "").toLowerCase() === "true",
      },
      { status: 500 }
    );
  }
}

