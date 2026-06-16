import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { SystemPage } from "@/components/app/SystemPage";
import { NcmCatalogClient } from "./NcmCatalogClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Catálogo NCM — E-COMEX" };

export default async function NcmCatalogPage() {
  const gate = await requireRole(["operator", "admin"]);
  if (!gate.ok) redirect("/app");

  return (
    <SystemPage
      maxWidth="wide"
      title="Catálogo NCM"
      description="Base de clasificaciones de productos. Se llena sola al cotizar y podés curarla (verificar, corregir, agregar). Las verificadas se reutilizan como clasificación de referencia."
    >
      <NcmCatalogClient />
    </SystemPage>
  );
}
