import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { SystemPage } from "@/components/app/SystemPage";

export const runtime = "nodejs";

export default async function ProveedoresPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <SystemPage
      title="Proveedores"
      description="Próximamente tendrás acceso a los proveedores validados por E-COMEX."
    >
      <div className="mt-8 rounded-xl border border-white/[0.08] bg-[#0B1622] p-6 text-sm text-[#b0b8c9]">
        Próximamente tendrás acceso a los proveedores validados por E-COMEX.
      </div>
    </SystemPage>
  );
}
