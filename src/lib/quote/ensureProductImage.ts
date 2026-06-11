/**
 * Completa `product.images` con una foto REAL del producto si todavía no tiene.
 * Usa el buscador con validación (src/lib/ai/productImageFinder): nunca pone
 * fotos inventadas/random — si no verifica una imagen, deja el producto sin
 * imagen y el PDF muestra el placeholder.
 *
 * No pisa imágenes ya presentes (ej. las que bajó el scraper del link del proveedor).
 */

import { findProductImage } from "@/lib/ai/productImageFinder";

type ProductLike = Record<string, unknown>;

function hasImage(product: ProductLike): boolean {
  const imgs = product.images;
  if (Array.isArray(imgs) && imgs.some((u) => typeof u === "string" && u.trim())) return true;
  const raw = product.raw as ProductLike | undefined;
  return Boolean(raw && typeof raw.operatorImageDataUrl === "string" && (raw.operatorImageDataUrl as string).trim());
}

export async function ensureProductImage(
  product: ProductLike
): Promise<{ filled: boolean; imageUrl?: string }> {
  if (hasImage(product)) return { filled: false }; // ya tiene (ej. del scraper del proveedor)

  const title = String(product.title ?? "").trim();
  if (!title) return { filled: false };
  const ncm = typeof product.ncm === "string" ? (product.ncm as string) : undefined;

  const found = await findProductImage(title, { ncm }).catch(() => null);
  if (!found) return { filled: false };

  const existing = Array.isArray(product.images) ? (product.images as unknown[]) : [];
  product.images = [found.imageUrl, ...existing.filter((u) => typeof u === "string" && u)];
  product.raw = {
    ...((product.raw as ProductLike) ?? {}),
    imageSource: found.sourceUrl,
    imageAuto: true,
  };
  return { filled: true, imageUrl: found.imageUrl };
}
