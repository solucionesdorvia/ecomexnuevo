import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SuppliersCrudClient, type SupplierRow } from "./SuppliersCrudClient";

export const runtime = "nodejs";
export const metadata = { title: "Proveedores — E-COMEX" };

export default async function ProveedoresPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await prisma.supplier.findMany({
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
  }).catch(() => []);

  const initialSuppliers: SupplierRow[] = rows.map((s) => ({
    id: s.id,
    name: s.name,
    country: s.country,
    contact: s.contact,
    createdAt: s.createdAt.toISOString(),
    operationsCount: s._count.operations,
  }));

  return (
    <div className="relative px-safe pb-10 pt-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(24,195,214,0.07),transparent_60%)]" />
      <div className="relative mx-auto w-full max-w-[900px]">
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]/80 px-5 py-5 backdrop-blur sm:px-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#18C3D6]/25 to-transparent" />
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#18C3D6]/[0.06] blur-3xl" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#3d4a5a]">Directorio</p>
          <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
            Proveedores
          </h1>
          <p className="mt-1 text-[13px] text-[#5a6577]">
            Tus proveedores internacionales. Asocialos a tus operaciones de importación.
          </p>
        </div>
        <SuppliersCrudClient initialSuppliers={initialSuppliers} />
      </div>
    </div>
  );
}
