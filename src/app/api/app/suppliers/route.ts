import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { RATE_LIMIT_MESSAGE, rateLimitByUser } from "@/lib/rateLimit";

export const runtime = "nodejs";

const HOUR_MS = 60 * 60 * 1000;

const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  country: z.string().min(1).max(100),
  contact: z.string().max(300).optional(),
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
    createdAt: s.createdAt.toISOString(),
    operationsCount: s._count.operations,
  };
}

/** Lista de proveedores del usuario (directorio). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const suppliers = await prisma.supplier.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        country: true,
        contact: true,
        createdAt: true,
        _count: { select: { operations: true } },
      },
    });

    return NextResponse.json({
      suppliers: suppliers.map(mapSupplier),
    });
  } catch (e) {
    console.error("[suppliers/GET] error fetching suppliers", e);
    return NextResponse.json({ error: "No se pudieron obtener los proveedores." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const rl = rateLimitByUser(user.id, "suppliers-post", 20, HOUR_MS);
  if (!rl.ok) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSupplierSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, country, contact } = parsed.data;
  try {
    const supplier = await prisma.supplier.create({
      data: {
        userId: user.id,
        name: name.trim(),
        country: country.trim(),
        contact: contact?.trim() ? contact.trim() : null,
      },
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
    console.error("[suppliers/POST] error creating supplier", e);
    return NextResponse.json({ error: "No se pudo crear el proveedor." }, { status: 500 });
  }
}
