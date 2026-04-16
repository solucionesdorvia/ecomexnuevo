import { Buffer } from "node:buffer";
import { basename } from "path";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const OPERATION_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXT = new Set(["pdf", "jpg", "jpeg", "png", "xlsx", "docx"]);

function extensionOf(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "";
}

export function sanitizeUploadFilename(name: string): string {
  const base = basename(name.replace(/\\/g, "/"));
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
  return cleaned || `file-${Date.now()}`;
}

/** Valida tamaño y extensión permitida. */
export function validateOperationUpload(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size > OPERATION_UPLOAD_MAX_BYTES) {
    return { ok: false, error: "El archivo supera el máximo de 10MB." };
  }
  if (file.size === 0) {
    return { ok: false, error: "El archivo está vacío." };
  }
  const ext = extensionOf(file.name);
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, error: "Tipo no permitido. Usá PDF, JPG, PNG, XLSX o DOCX." };
  }
  return { ok: true };
}

/**
 * Guarda el archivo y devuelve URL pública y nombre de visualización.
 * - Con `BLOB_READ_WRITE_TOKEN`: Vercel Blob.
 * - Si no: `public/uploads/[operationId]/[filename]` → URL `/uploads/...`
 */
export async function persistOperationDocumentFile(
  operationId: string,
  file: File
): Promise<{ url: string; displayName: string }> {
  const v = validateOperationUpload(file);
  if (!v.ok) throw new Error(v.error);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const displayName = file.name?.trim() || "documento";
  const safe = sanitizeUploadFilename(displayName);
  const unique = `${Date.now()}-${safe}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const key = `operations/${operationId}/${unique}`;
      const blob = await put(key, Buffer.from(bytes), {
        access: "public",
        addRandomSuffix: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      return { url: blob.url, displayName };
    } catch (e) {
      console.warn("[operationDocumentUpload] Blob failed, using local filesystem:", e);
    }
  }

  const dir = path.join(process.cwd(), "public", "uploads", operationId);
  await mkdir(dir, { recursive: true });
  const fp = path.join(dir, unique);
  await writeFile(fp, bytes);
  const encoded = encodeURIComponent(unique);
  return { url: `/uploads/${operationId}/${encoded}`, displayName };
}
