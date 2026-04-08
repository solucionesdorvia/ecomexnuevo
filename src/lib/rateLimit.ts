/**
 * Fixed-window in-memory rate limiter for auth routes.
 * Key: client IP + route. Limits apply per Node process; with multiple Railway replicas
 * each instance has its own counters — use Redis/Upstash for a global limit later.
 */

const store = new Map<string, { count: number; resetAt: number }>();

function parsePositiveInt(env: string | undefined, fallback: number): number {
  const n = Number.parseInt(String(env ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function pruneExpired(now: number) {
  if (store.size < 500) return;
  for (const [k, v] of store) {
    if (now >= v.resetAt) store.delete(k);
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

export type AuthRouteKey = "login" | "register";

export function rateLimitAuth(
  req: Request,
  routeKey: AuthRouteKey
): { ok: true } | { ok: false; retryAfterSec: number } {
  const max = parsePositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 20);
  const windowMs = parsePositiveInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000);

  const ip = getClientIp(req);
  const key = `${ip}:${routeKey}`;
  const now = Date.now();
  pruneExpired(now);

  let bucket = store.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count > max) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    return { ok: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }
  return { ok: true };
}
