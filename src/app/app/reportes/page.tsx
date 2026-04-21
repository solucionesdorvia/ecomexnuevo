import Link from "next/link";
import { SystemEmpty, SystemPage, SystemSection } from "@/components/app/SystemPage";

export const metadata = { title: "Reportes — E-COMEX" };

export default function ReportesPage() {
  return (
    <SystemPage
      title="Reportes"
      description="Historial de análisis y reportes exportados para trazabilidad."
    >
      <SystemSection title="Registro de reportes">
        <SystemEmpty
          title="Todavía no tenés reportes"
          description="Cuando completes cotizaciones con PDF, vas a verlas acá con su fecha y total."
          action={
            <Link
              href="/app/nueva"
              className="inline-flex items-center justify-center rounded-lg bg-[#2b59ff] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2348d4]"
            >
              Nueva operación
            </Link>
          }
        />
      </SystemSection>
    </SystemPage>
  );
}
