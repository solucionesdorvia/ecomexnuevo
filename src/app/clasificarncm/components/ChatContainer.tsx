"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/clasificar-ncm/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

export function ChatContainer({
  messages,
  pending,
}: {
  messages: ChatMessage[];
  pending: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-5"
    >
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {pending ? <TypingIndicator /> : null}
        <div ref={bottomRef} className="h-px shrink-0" />
      </div>
    </div>
  );
}
