import type { Metadata } from "next";
import ChatClient from "./ui/ChatClient";

export const metadata: Metadata = {
  title: "E‑Comex — Chat de importación",
  description:
    "Pegá un link o describí tu producto. Recibí una cotización completa dentro del chat, con explicación y tiempos estimados.",
};

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const initialMode = mode === "budget" ? "budget" : "quote";

  return <ChatClient initialMode={initialMode} />;
}

