import type { SupportedSource } from "@/lib/analyzeProduct/types";
import { extractAmazon } from "./amazon";
import { extractAlibaba } from "./alibaba";
import { extract1688 } from "./1688";

export function extractBySource(
  source: SupportedSource,
  html: string,
  contentText: string
) {
  switch (source) {
    case "amazon":
      return extractAmazon(html, contentText);
    case "alibaba":
      return extractAlibaba(html, contentText);
    case "1688":
      return extract1688(html, contentText);
  }
}

