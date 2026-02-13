import "dotenv/config";
import { NextResponse } from "next/server";
import { getArsPerUsd, getArsPerUsdCacheSnapshot } from "@/lib/fx/arsPerUsd";

export const runtime = "nodejs";

export async function GET() {
  const arsPerUsd = await getArsPerUsd({ ttlMs: 10 * 60 * 1000 });
  const snap = getArsPerUsdCacheSnapshot();
  const now = Date.now();
  const expiresInSec =
    snap?.expiresAt && snap.expiresAt > now ? Math.round((snap.expiresAt - now) / 1000) : 0;

  return NextResponse.json({
    ok: true,
    arsPerUsd,
    source: snap?.source ?? null,
    lastUpdatedAt: snap?.lastUpdatedAt ?? null,
    expiresInSec,
  });
}

