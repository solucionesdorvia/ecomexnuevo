import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/jwt";

export type SessionRole = "user" | "operator" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  role: SessionRole;
};

function normalizeRole(value: unknown): SessionRole {
  return value === "admin" || value === "operator" ? value : "user";
}

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
        role: "admin",
      },
      update: { role: "admin" },
      select: { id: true, email: true, role: true },
    });
    return {
      id: u.id,
      email: u.email,
      role: normalizeRole(u.role),
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
    role: normalizeRole(u.role),
  };
}

/**
 * Acceso "dueño": cerrado y SEPARADO del rol admin. Un admin (ej. un socio) NO
 * entra salvo que su email esté en OWNER_EMAILS (lista separada por comas, en
 * Railway). Sirve para vistas privadas del dueño que ni siquiera los admins ven.
 */
export function isOwnerEmail(email: string | null | undefined): boolean {
  const list = String(process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length || !email) return false;
  return list.includes(email.trim().toLowerCase());
}

/** Gate de dueño. Devuelve 404 a los no-dueños para que la página "no exista". */
export async function requireOwner() {
  const u = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, user: null };
  if (!isOwnerEmail(u.email)) return { ok: false as const, status: 404 as const, user: u };
  return { ok: true as const, status: 200 as const, user: u };
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

