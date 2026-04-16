import { SignJWT, jwtVerify } from "jose";

type AuthPayload = {
  sub: string;
  email: string;
};

const WEAK_SECRETS = new Set(["dev-change-me", "secret", "change-me", "changeme", "development"]);

function secretKey() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("Falta AUTH_JWT_SECRET");
  if (process.env.NODE_ENV === "production") {
    if (secret.length < 32) throw new Error("AUTH_JWT_SECRET debe tener al menos 32 caracteres en producción");
    if (WEAK_SECRETS.has(secret)) throw new Error("AUTH_JWT_SECRET inseguro: usá un valor aleatorio en producción");
  }
  return new TextEncoder().encode(secret);
}

export async function signAuthToken(payload: AuthPayload) {
  return await new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifyAuthToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof (payload as any).email === "string" ? (payload as any).email : null;
    if (!sub || !email) return null;
    return { sub, email };
  } catch {
    return null;
  }
}

