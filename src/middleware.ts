import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  // Skip API/internal/static assets and redirect app routes to landing.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
