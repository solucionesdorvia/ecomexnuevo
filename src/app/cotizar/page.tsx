import type { Metadata } from "next";
import QuotationFlowClient from "@/app/chat/ui/QuotationFlowClient";

export const metadata: Metadata = {
  title: "E-COMEX | Import Analysis Flow",
  description:
    "Cotización estructurada de importación: snapshot, NCM, regulaciones, costos landed, timing y export PDF.",
};

export default async function CotizarPage() {
  return <QuotationFlowClient initialMode="quote" />;
}

