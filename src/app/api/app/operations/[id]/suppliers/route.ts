import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { operationWhereForUser } from "@/lib/operations/operationAccess";

export const runtime = "nodejs";

const bodySchema = z.object({
  supplierId: z.string().min(1, "supplierId requerido"),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id: operationId } = await params;
  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors.supplierId?.[0] ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const where = operationWhereForUser(user, operationId);
  let operation: { id: string } | null = null;
  try {
    operation = await prisma.operation.findFirst({ where, select: { id: true } });
  } catch (e) {
    console.error("[op-suppliers/POST] error finding operation", e);
    return NextResponse.json({ error: "No se pudo verificar la operación." }, { status: 500 });
  }
  if (!operation) {
    return NextResponse.json({ error: "Operación no encontrada." }, { status: 404 });
  }

  let supplier: { id: string } | null = null;
  try {
    supplier = await prisma.supplier.findFirst({
      where: { id: parsed.data.supplierId, userId: user.id },
      select: { id: true },
    });
  } catch (e) {
    console.error("[op-suppliers/POST] error finding supplier", e);
    return NextResponse.json({ error: "No se pudo verificar el proveedor." }, { status: 500 });
  }
  if (!supplier) {
    return NextResponse.json({ error: "Proveedor no encontrado o no te pertenece." }, { status: 404 });
  }

  try {
    await prisma.operation.update({
      where: { id: operation.id },
      data: {
        suppliers: { connect: { id: supplier.id } },
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo vincular el proveedor (¿ya estaba asignado?)." }, { status: 409 });
  }

  return NextResponse.json({ ok: true as const });
}
