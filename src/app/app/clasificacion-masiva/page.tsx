import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { MasivoClient } from "./MasivoClient";

export const runtime = "nodejs";
export const metadata = { title: "Clasificación masiva — E-COMEX" };

// Esta página vive bajo /app, así que el chrome (sidebar + topbar) lo provee
// /app/layout.tsx. Acá solo renderizamos el contenido (sin envolver en AppShell,
// que duplicaba la navbar).
export default async function ClasificacionMasivaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/app/clasificacion-masiva");
  if (user.role !== "operator" && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl p-8 text-[#5a6577]">
        La clasificación masiva está disponible para operadores del equipo.
      </div>
    );
  }
  return <MasivoClient />;
}
