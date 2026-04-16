import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { listUserOperationDocuments } from "@/lib/documents/listUserOperationDocuments";

export const runtime = "nodejs";

/** Índice de documentos de importaciones del usuario. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const docs = await listUserOperationDocuments(user.id);

  return NextResponse.json({
    documents: docs.map((d) => ({
      id: d.id,
      name: d.name,
      url: d.url,
      uploadedBy: d.uploadedBy,
      createdAt: d.createdAt.toISOString(),
      operation: {
        id: d.operation.id,
        stage: d.operation.stage,
        quote: d.operation.quote,
      },
    })),
  });
}
