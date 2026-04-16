import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { operationWhereForUser } from "@/lib/operations/operationAccess";
import { RATE_LIMIT_MESSAGE, rateLimitByUser } from "@/lib/rateLimit";
import { persistOperationDocumentFile } from "@/lib/storage/operationDocumentUpload";

export const runtime = "nodejs";

const HOUR_MS = 60 * 60 * 1000;

const bodySchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(500),
  url: z.string().min(1, "URL requerida").max(4000),
});

async function createDocumentWithNotification(
  operation: { id: string; userId: string },
  user: { id: string; email: string },
  name: string,
  url: string
) {
  const nameTrim = name.trim();
  const urlTrim = url.trim();

  return prisma.$transaction(async (tx) => {
    const doc = await tx.operationDocument.create({
      data: {
        operationId: operation.id,
        name: nameTrim,
        url: urlTrim,
        uploadedBy: user.email,
      },
      select: {
        id: true,
        name: true,
        url: true,
        uploadedBy: true,
        createdAt: true,
      },
    });

    if (user.id !== operation.userId) {
      await tx.notification.create({
        data: {
          userId: operation.userId,
          operationId: operation.id,
          type: "DOCUMENT_ADDED",
          title: "Nuevo documento en tu importación",
          body: nameTrim,
        },
      });
    }

    return doc;
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const rl = rateLimitByUser(user.id, "documents-post", 20, HOUR_MS);
  if (!rl.ok) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const { id: operationId } = await params;
  const where = operationWhereForUser(user, operationId);
  const operation = await prisma.operation.findFirst({ where, select: { id: true, userId: true } });
  if (!operation) {
    return NextResponse.json({ error: "Operación no encontrada." }, { status: 404 });
  }

  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Formulario inválido." }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
    }

    const nameOverride = formData.get("name");
    let displayName: string;
    let publicUrl: string;
    try {
      const saved = await persistOperationDocumentFile(operation.id, file);
      publicUrl = saved.url;
      displayName =
        typeof nameOverride === "string" && nameOverride.trim()
          ? nameOverride.trim().slice(0, 500)
          : saved.displayName;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al subir.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const doc = await createDocumentWithNotification(operation, user, displayName, publicUrl);

    return NextResponse.json({
      document: {
        ...doc,
        createdAt: doc.createdAt.toISOString(),
      },
    });
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    const err = parsed.error.flatten().fieldErrors;
    const msg = [err.name?.[0], err.url?.[0]].filter(Boolean).join(" ") || "Datos inválidos.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const doc = await createDocumentWithNotification(operation, user, parsed.data.name, parsed.data.url);

  return NextResponse.json({
    document: {
      ...doc,
      createdAt: doc.createdAt.toISOString(),
    },
  });
}
