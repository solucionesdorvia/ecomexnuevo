import type { Metadata } from "next";
import QuotationFlowClient from "@/app/chat/ui/QuotationFlowClient";

export const metadata: Metadata = {
  title: "E-COMEX | Import Analysis Flow",
  description:
    "Cotización estructurada de importación: snapshot, NCM, regulaciones, costos landed, timing y export PDF.",
};

export default async function CotizarPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const qp = await searchParams;
  const source =
    qp?.source === "image" || qp?.source === "invoice" || qp?.source === "text"
      ? qp.source
      : "url";
  return <QuotationFlowClient initialMode="quote" initialSource={source} />;
}

