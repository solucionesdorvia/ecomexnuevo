import type { SupportedSource } from "@/lib/analyzeProduct/types";

export function detectSource(url: string): SupportedSource | null {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }

  const h = host.replace(/^www\./, "");

  if (h === "alibaba.com" || h.endsWith(".alibaba.com")) return "alibaba";
  if (h === "1688.com" || h.endsWith(".1688.com")) return "1688";
  if (h === "amazon.com" || h.endsWith(".amazon.com") || h.includes("amazon.")) return "amazon";

  return null;
}

