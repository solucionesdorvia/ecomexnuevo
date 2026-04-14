import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_FILES = 8;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Enviá multipart/form-data con archivos invoice." }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Formulario inválido." }, { status: 400 });
  }

  const files = form.getAll("invoice").filter((x): x is File => x instanceof File && x.size > 0);
  if (!files.length) {
    return NextResponse.json({ error: "Falta al menos un archivo en el campo invoice." }, { status: 400 });
  }

  const slice = files.slice(0, MAX_FILES);
  for (const f of slice) {
    if (f.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `El archivo "${f.name}" supera el límite de ${MAX_BYTES / 1024 / 1024} MB.` },
        { status: 400 }
      );
    }
  }

  const { extractInvoiceTextsMerged } = await import("@/lib/invoice/extractTextFromInvoiceFile");
  const text = await extractInvoiceTextsMerged(slice);

  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const existing = cookieStore.get("ecomex_anon")?.value;
  const anonId = existing && existing.length >= 8 ? existing : crypto.randomUUID();

  const res = NextResponse.json({ ok: true as const, text });
  res.cookies.set("ecomex_anon", anonId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
