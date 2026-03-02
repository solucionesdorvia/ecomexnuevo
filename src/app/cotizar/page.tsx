import type { Metadata } from "next";
import CotizarClient from "@/app/cotizar/ui/CotizarClient";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "E-COMEX | Import Analysis Flow",
  description:
    "Cotización estructurada de importación: snapshot, NCM, regulaciones, costos landed, timing y export PDF.",
};

export default async function CotizarPage() {
  const user = await getSessionUser();
  return <CotizarClient currentRole={user?.role ?? "user"} />;
}

