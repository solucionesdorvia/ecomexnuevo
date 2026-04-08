"use client";

import type { ChatMessage as Msg } from "@/lib/clasificar-ncm/types";
import { AssistantMessage } from "./AssistantMessage";
import { UserMessage } from "./UserMessage";

export function MessageBubble({ message }: { message: Msg }) {
  if (message.role === "user") {
    return <UserMessage content={message.content} />;
  }
  return <AssistantMessage content={message.content} />;
}

/** Alias pedido por arquitectura de componentes */
export { MessageBubble as ChatMessage };
