import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { OperatorBudgetClient } from "@/app/interno/ui/OperatorBudgetClient";

export const runtime = "nodejs";

export default async function OperadorPage() {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) redirect("/account/login");

  return (
    <div className="min-h-screen bg-background-dark font-[var(--font-outfit)] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-[rgba(24,195,214,0.15)] bg-background-dark/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 text-primary">
            <span className="material-symbols-outlined text-3xl">precision_manufacturing</span>
            <h1 className="text-xl font-extrabold tracking-tight text-white">Operator Console</h1>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            Internal
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1320px] px-6 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-black tracking-tight text-white">
            Excel + fotos → borrador automático → ajuste manual
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Carga operativa con trazabilidad de overrides y exportación PDF.
          </p>
        </div>
        <OperatorBudgetClient />
      </main>
    </div>
  );
}

