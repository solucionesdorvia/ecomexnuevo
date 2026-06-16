import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { SystemPage } from "@/components/app/SystemPage";
import {
  DEFAULT_FREIGHT_RATES,
  FREIGHT_FIELDS,
  hydrateFreightConfig,
} from "@/lib/quote/freightRatesConfig";
import { FletesEditor } from "./FletesEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Tarifas de flete — E-COMEX" };

export default async function FletesPage() {
  const gate = await requireRole(["admin"]);
  if (!gate.ok) redirect("/app");

  const config = await hydrateFreightConfig(true);

  return (
    <SystemPage
      maxWidth="wide"
      title="Tarifas de flete"
      description="Valores que usa el cotizador para calcular el flete. Editables solo por administradores; los cambios se aplican a las nuevas cotizaciones."
      action={
        <span className="rounded bg-[#18C3D6]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#18C3D6]">
          Solo admin
        </span>
      }
    >
      <FletesEditor initialConfig={config} defaults={DEFAULT_FREIGHT_RATES} fields={FREIGHT_FIELDS} />
    </SystemPage>
  );
}
