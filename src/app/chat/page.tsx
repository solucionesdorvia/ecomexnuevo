import type { Metadata } from "next";
import ImportFlowClient from "./ui/ImportFlowClient";

export const metadata: Metadata = {
  title: "E‑Comex — Análisis de importación",
  description:
    "Ingresá un link o una descripción. El sistema materializa el proceso de importación en módulos: producto, clasificación, requisitos, costos, timeline y reporte.",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const initialMode = mode === "budget" ? "budget" : "quote";

  return <ImportFlowClient initialMode={initialMode} />;
}

