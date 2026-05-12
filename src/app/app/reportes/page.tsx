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
              className="inline-flex items-center justify-center rounded-lg bg-[#18C3D6] px-4 py-2.5 text-[13px] font-medium text-[#030d18] transition-colors hover:bg-[#0ea5b9]"
            >
              Nueva operación
            </Link>
          }
        />
      </SystemSection>
    </SystemPage>
  );
}
