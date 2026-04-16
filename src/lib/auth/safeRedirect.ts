/**
 * Evita open-redirect: solo paths relativos que empiezan con un solo "/".
 */
export function safeInternalRedirectPath(raw: string | undefined): string {
  if (!raw || typeof raw !== "string") return "/app";
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/app";
  try {
    const u = new URL(trimmed, "https://example.com");
    if (u.protocol !== "https:" && u.protocol !== "http:") return "/app";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/app";
  }
}
