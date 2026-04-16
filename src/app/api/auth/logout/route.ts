import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  // Use a relative redirect to preserve the current browser origin.
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: "/login" },
  });
  res.cookies.set("ecomex_auth", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

