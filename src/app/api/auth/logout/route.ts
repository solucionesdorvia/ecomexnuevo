import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL("/account/login", req.url);
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set("ecomex_auth", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

