import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth/jwt";
import {
  validateOperationUpload,
  sanitizeUploadFilename,
} from "@/lib/storage/operationDocumentUpload";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { Buffer } from "node:buffer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ecomex_auth")?.value ?? null;
  const auth = token ? await verifyAuthToken(token) : null;
  if (!auth?.sub) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "FormData inválido." }, { status: 400 });
  }

  const file = formData.get("file");
  const docType = String(formData.get("docType") ?? "otro");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Falta el archivo." }, { status: 400 });
  }

  const validation = validateOperationUpload(file);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const safe = sanitizeUploadFilename(file.name);
  const unique = `${Date.now()}-${safe}`;
  let url: string;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const key = `users/${auth.sub}/docs/${docType}/${unique}`;
      const blob = await put(key, Buffer.from(bytes), {
        access: "public",
        addRandomSuffix: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      url = blob.url;
    } catch {
      url = await saveLocal(auth.sub, docType, unique, bytes);
    }
  } else {
    url = await saveLocal(auth.sub, docType, unique, bytes);
  }

  return NextResponse.json({ ok: true, url, name: file.name, docType });
}

async function saveLocal(userId: string, docType: string, filename: string, bytes: Uint8Array) {
  const dir = path.join(process.cwd(), "public", "uploads", "users", userId, docType);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);
  return `/uploads/users/${userId}/${docType}/${encodeURIComponent(filename)}`;
}
