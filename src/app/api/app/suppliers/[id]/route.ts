import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const patchSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  country: z.string().min(1).max(100).optional(),
  contact: z.union([z.string().max(300), z.literal("")]).optional(),
});

function mapSupplier(s: {
  id: string;
  name: string;
  country: string;
  contact: string | null;
  createdAt: Date;
  _count: { operations: number };
}) {
  return {
    id: s.id,
    name: s.name,
    country: s.country,
    contact: s.contact,
    createdAt: s.createdAt,
    operationsCount: s._count.operations,
  };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Falta id." }, { status: 400 });
  }

  let existing: { id: string } | null = null;
  try {
    existing = await prisma.supplier.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
  } catch (e) {
    console.error("[suppliers/PATCH] error finding supplier", e);
    return NextResponse.json({ error: "No se pudo verificar el proveedor." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Proveedor no encontrado." }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patchSupplierSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const update: { name?: string; country?: string; contact?: string | null } = {};
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.country !== undefined) update.country = data.country.trim();
  if (data.contact !== undefined) {
    update.contact = data.contact.trim() === "" ? null : data.contact.trim();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  try {
    const supplier = await prisma.supplier.update({
      where: { id },
      data: update,
      select: {
        id: true,
        name: true,
        country: true,
        contact: true,
        createdAt: true,
        _count: { select: { operations: true } },
      },
    });

    return NextResponse.json({ supplier: mapSupplier(supplier) });
  } catch (e) {
    console.error("[suppliers/PATCH] error updating supplier", e);
    return NextResponse.json({ error: "No se pudo actualizar el proveedor." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Falta id." }, { status: 400 });
  }

  let existing2: { id: string } | null = null;
  try {
    existing2 = await prisma.supplier.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
  } catch (e) {
    console.error("[suppliers/DELETE] error finding supplier", e);
    return NextResponse.json({ error: "No se pudo verificar el proveedor." }, { status: 500 });
  }
  if (!existing2) {
    return NextResponse.json({ error: "Proveedor no encontrado." }, { status: 404 });
  }

  try {
    await prisma.supplier.delete({ where: { id } });
  } catch (e) {
    console.error("[suppliers/DELETE] error deleting supplier", e);
    return NextResponse.json({ error: "No se pudo eliminar el proveedor." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
