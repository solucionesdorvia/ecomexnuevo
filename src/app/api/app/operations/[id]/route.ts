import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { loadOperationDetail } from "@/lib/operations/loadOperationDetail";

export const runtime = "nodejs";

/** [id] = operationId */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id: operationId } = await params;
  if (!operationId?.trim()) {
    return NextResponse.json({ error: "Falta id de operación." }, { status: 400 });
  }

  const data = await loadOperationDetail(operationId, user);
  if (!data) {
    return NextResponse.json({ error: "Operación no encontrada." }, { status: 404 });
  }

  const { operation, comments } = data;

  return NextResponse.json({
    operation: {
      id: operation.id,
      quoteId: operation.quoteId,
      userId: operation.userId,
      stage: operation.stage,
      createdAt: operation.createdAt.toISOString(),
      updatedAt: operation.updatedAt.toISOString(),
      quote: operation.quote,
      timeline: operation.timeline.map((e) => ({
        id: e.id,
        stage: e.stage,
        description: e.description,
        actor: e.actor,
        createdAt: e.createdAt.toISOString(),
      })),
      documents: operation.documents.map((d) => ({
        id: d.id,
        name: d.name,
        url: d.url,
        uploadedBy: d.uploadedBy,
        createdAt: d.createdAt.toISOString(),
      })),
      suppliers: operation.suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        country: s.country,
        contact: s.contact,
      })),
    },
    comments,
  });
}
