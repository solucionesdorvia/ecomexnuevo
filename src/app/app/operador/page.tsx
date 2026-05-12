import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { OperadorTabsClient } from "./OperadorTabsClient";
import { SystemPage } from "@/components/app/SystemPage";

export const runtime = "nodejs";

export default async function OperadorPage() {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) redirect("/app");

  return (
    <SystemPage
      maxWidth="wide"
      title="Panel operador"
      description="Presupuestos internos e importaciones acompañadas por el equipo."
      action={
        <span className="rounded bg-[#18C3D6]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#18C3D6]">
          {gate.user.role}
        </span>
      }
    >
      <div className="mt-8">
        <OperadorTabsClient />
      </div>
    </SystemPage>
  );
}
