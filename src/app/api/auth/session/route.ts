import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({
    ok: true,
    user: { email: user.email, role: user.role },
  });
}
