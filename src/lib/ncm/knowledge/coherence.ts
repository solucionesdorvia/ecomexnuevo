import type { NcmSearchHit } from "./types";

/** Producto tipo wearable de consumo (muñeca / salud). */
const WEARABLE_CONSUMER =
  /\b(smartwatch|apple watch|galaxy watch|pixel watch|reloj inteligente|reloj conectado|wearable|pulsera inteligente|fitbit|amazfit|huawei watch|xiaomi watch)\b/i;

/**
 * Términos típicos de equipamiento de red / infra — incoherentes con un wearable de usuario final.
 * (Pueden aparecer en 8517 u otros capítulos por la palabra "datos" / "transmisión".)
 */
const INFRA_NETWORK_DESC =
  /\b(multiplex|multiplexor|multíplex|conmutador(?:es)?\s+de\s+(?:red|datos|ethernet)|\bswitch(?:es)?\s+(?:de\s+)?(?:red|datos|ethernet|óptico|fibra)|centrales?\s+telef[oó]nicas?|estaci[oó]n\s+base|repetidor(?:es)?\s+de\s+radio|router(?:es)?\s+de\s+(?:tr[aá]fico|n[uú]cleo)|infraestructura\s+de\s+red)\b/i;

export function filterIncoherentForProductText(productText: string, hits: NcmSearchHit[]): NcmSearchHit[] {
  if (!WEARABLE_CONSUMER.test(productText)) return hits;
  return hits.filter((h) => {
    const blob = `${h.description} ${h.chapterTitle}`.toLowerCase();
    if (INFRA_NETWORK_DESC.test(blob)) return false;
    return true;
  });
}
