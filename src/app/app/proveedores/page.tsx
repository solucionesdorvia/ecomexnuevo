import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SuppliersCrudClient, type SupplierRow } from "./SuppliersCrudClient";
import { SystemPage } from "@/components/app/SystemPage";

export const runtime = "nodejs";

export default async function ProveedoresPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const raw = await prisma.supplier.findMany({
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

  const initialSuppliers: SupplierRow[] = raw.map((s) => ({
    id: s.id,
    name: s.name,
    country: s.country,
    contact: s.contact,
    createdAt: s.createdAt.toISOString(),
    operationsCount: s._count.operations,
  }));

  return (
    <SystemPage
      title="Proveedores"
      description="Directorio centralizado de proveedores internacionales vinculados a tus importaciones."
    >
      <div className="mt-8">
        <SuppliersCrudClient initialSuppliers={initialSuppliers} />
      </div>
    </SystemPage>
  );
}
