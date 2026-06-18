import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";
import { getAuthSecretKey } from "./jwt";

/**
 * Tokens de "restablecer contraseña" — stateless (firmados con el mismo secreto
 * que la sesión), sin tabla en la base.
 *
 * Seguridad:
 * - `purpose: "pwreset"` evita que un token de sesión sirva como token de reset.
 * - `pvh` (password version hash): huella de la contraseña ACTUAL. Al cambiar la
 *   contraseña, el hash cambia y la huella deja de coincidir → el link es de un
 *   solo uso y cualquier link viejo queda invalidado automáticamente.
 * - Expira a los 45 minutos.
 */

const RESET_TOKEN_TTL = "45m";

/** Huella corta y estable de un passwordHash (no reversible). */
export function passwordFingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

export async function signResetToken(userId: string, passwordHash: string): Promise<string> {
  return await new SignJWT({ purpose: "pwreset", pvh: passwordFingerprint(passwordHash) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(RESET_TOKEN_TTL)
    .sign(getAuthSecretKey());
}

export async function verifyResetToken(
  token: string
): Promise<{ userId: string; pvh: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    if (payload.purpose !== "pwreset") return null;
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    const pvh = typeof (payload as { pvh?: unknown }).pvh === "string" ? (payload as { pvh: string }).pvh : null;
    if (!userId || !pvh) return null;
    return { userId, pvh };
  } catch {
    return null;
  }
}
