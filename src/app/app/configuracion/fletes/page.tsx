import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { SystemPage } from "@/components/app/SystemPage";
import {
  DEFAULT_FREIGHT_RATES,
  FREIGHT_FIELDS,
  hydrateFreightConfig,
} from "@/lib/quote/freightRatesConfig";
import {
  DEFAULT_IMPORT_EXPENSES,
  EXPENSE_FIELDS,
  hydrateImportExpenses,
} from "@/lib/quote/importExpensesConfig";
import { FletesEditor } from "./FletesEditor";

const FREIGHT_GROUPS = ["Aéreo", "Marítimo FCL", "Marítimo LCL", "Almacenaje"];
const EXPENSE_GROUPS = ["Gastos de despacho", "Vehículos (cap. 87)", "Impuestos sobre servicios"];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Tarifas de flete — E-COMEX" };

export default async function FletesPage() {
  const gate = await requireRole(["admin"]);
  if (!gate.ok) redirect("/app");

  const [config, expenses] = await Promise.all([
    hydrateFreightConfig(true),
    hydrateImportExpenses(true),
  ]);

  return (
    <SystemPage
      maxWidth="wide"
      title="Tarifas y gastos"
      description="Valores que usa el cotizador para calcular flete y gastos de importación. Editables solo por administradores; los cambios se aplican a las nuevas cotizaciones."
      action={
        <span className="rounded bg-[#18C3D6]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#18C3D6]">
          Solo admin
        </span>
      }
    >
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-[#5a6577]">Tarifas de flete</h2>
          <FletesEditor
            initialConfig={config}
            defaults={DEFAULT_FREIGHT_RATES}
            fields={FREIGHT_FIELDS}
            groupOrder={FREIGHT_GROUPS}
            endpoint="/api/admin/fletes"
          />
        </section>
        <section>
          <h2 className="mb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-[#5a6577]">Gastos de importación</h2>
          <FletesEditor
            initialConfig={expenses}
            defaults={DEFAULT_IMPORT_EXPENSES}
            fields={EXPENSE_FIELDS}
            groupOrder={EXPENSE_GROUPS}
            endpoint="/api/admin/gastos"
          />
        </section>
      </div>
    </SystemPage>
  );
}
