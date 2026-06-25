import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AppShell } from "@/components/shell/AppShell";
import { MasivoClient } from "./MasivoClient";

export const runtime = "nodejs";
export const metadata = { title: "Clasificación masiva — E-COMEX" };

export default async function ClasificacionMasivaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/app/clasificacion-masiva");
  if (user.role !== "operator" && user.role !== "admin") {
    return (
      <AppShell active="cotizaciones">
        <div className="mx-auto max-w-xl p-8 text-slate-300">
          La clasificación masiva está disponible para operadores del equipo.
        </div>
      </AppShell>
    );
  }
  return (
    <AppShell active="cotizaciones">
      <MasivoClient />
    </AppShell>
  );
}
