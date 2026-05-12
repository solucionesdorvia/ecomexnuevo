"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/clasificar-ncm/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

export function ChatContainer({
  messages,
  pending,
  /** Sin scroll propio: el padre hace overflow (ej. /clasificador). */
  embedded = false,
}: {
  messages: ChatMessage[];
  pending: boolean;
  embedded?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  const inner = (
    <div
      className="mx-auto flex w-full min-w-0 max-w-[min(100%,720px)] flex-col gap-5 sm:gap-6"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {pending ? <TypingIndicator /> : null}
      <div ref={bottomRef} className="h-2 shrink-0" aria-hidden />
    </div>
  );

  if (embedded) {
    return <div className="w-full px-1">{inner}</div>;
  }

  return (
    <div
      ref={scrollRef}
      className="chat-thread-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth px-3 py-4 sm:px-6 sm:py-5"
    >
      {inner}
    </div>
  );
}
