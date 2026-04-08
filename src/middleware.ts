import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Blocks /api/debug/* in production unless explicitly enabled.
 * Set ENABLE_DEBUG_API=true on staging; optionally set DEBUG_API_SECRET and send header x-debug-secret.
 */
export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const enabled = (process.env.ENABLE_DEBUG_API ?? "").toLowerCase() === "true";
  if (!enabled) {
    return new NextResponse(null, { status: 404 });
  }

  const secret = process.env.DEBUG_API_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("x-debug-secret");
    if (header !== secret) {
      return new NextResponse(null, { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/debug/:path*",
};
