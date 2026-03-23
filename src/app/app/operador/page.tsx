import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { OperatorBudgetClient } from "@/app/interno/ui/OperatorBudgetClient";

export const runtime = "nodejs";

export default async function OperadorPage() {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) redirect("/app");

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1100px]">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
              Panel Operador
            </h1>
            <p className="mt-1 text-[14px] text-[#555c6b]">
              Carga, ajuste y exportación de presupuestos internos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#7c3aed]/10 px-2.5 py-1 text-[10px] font-bold text-[#7c3aed]">
              {gate.user.role}
            </span>
          </div>
        </div>

        <div className="mt-8">
          <OperatorBudgetClient />
        </div>
      </div>
    </div>
  );
}
