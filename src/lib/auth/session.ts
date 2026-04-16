import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/jwt";

export type SessionUser = {
  id: string;
  email: string;
  role: "user" | "operator" | "admin";
};

function isRoleBypassEnabled() {
  // Requires explicit opt-in: AUTH_ROLE_BYPASS=1 (never active in production)
  return process.env.NODE_ENV !== "production" && process.env.AUTH_ROLE_BYPASS === "1";
}

async function getOrCreateLocalBypassUser(): Promise<SessionUser | null> {
  if (!isRoleBypassEnabled()) return null;
  const email = String(process.env.AUTH_ROLE_BYPASS_EMAIL ?? "bypass.operator@ecomex.local")
    .trim()
    .toLowerCase();

  try {
    const u = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash: "__local_bypass_only__",
        role: "admin" as any,
      },
      update: { role: "admin" as any },
      select: { id: true, email: true, role: true },
    });
    return {
      id: u.id,
      email: u.email,
      role: (u as any).role || "admin",
    };
  } catch {
    // Last fallback to keep local UI testing unblocked if DB is temporarily unavailable.
    return { id: "__local_bypass__", email, role: "admin" };
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value ?? null;
  if (!token) return null;

  const payload = await verifyAuthToken(token);
  if (!payload) return null;

  const u = await prisma.user
    .findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    })
    .catch(() => null);
  if (!u) return null;

  return {
    id: u.id,
    email: u.email,
    role: (u as any).role || "user",
  };
}

export async function requireRole(roles: Array<SessionUser["role"]>) {
  const u = await getSessionUser();
  if (!u) {
    const bypassUser = await getOrCreateLocalBypassUser();
    if (bypassUser) return { ok: true as const, status: 200 as const, user: bypassUser };
    return { ok: false as const, status: 401 as const, user: null };
  }
  if (!roles.includes(u.role)) {
    const bypassUser = await getOrCreateLocalBypassUser();
    if (bypassUser) {
      return { ok: true as const, status: 200 as const, user: bypassUser };
    }
    return { ok: false as const, status: 403 as const, user: u };
  }
  return { ok: true as const, status: 200 as const, user: u };
}

