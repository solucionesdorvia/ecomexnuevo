"use client";

import type { ReactNode } from "react";

/** **negrita**, listas `-` / `*`, párrafos. Sin HTML crudo. */
export function SimpleMarkdown({ text }: { text: string }) {
  const raw = text.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < raw.length) {
    const line = raw[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < raw.length && /^\s*[-*]\s+/.test(raw[i])) {
        items.push(raw[i].replace(/^\s*[-*]\s+/, "").trim());
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-1 list-none space-y-1.5 pl-0">
          {items.map((item, ii) => (
            <li key={ii} className="flex gap-2 break-words leading-relaxed [overflow-wrap:anywhere]">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400/70" aria-hidden />
              <span>
                <InlineBold text={item} />
              </span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    blocks.push(
      <p key={key++} className="break-words leading-relaxed [overflow-wrap:anywhere]">
        <InlineBold text={line} />
      </p>,
    );
    i++;
  }

  if (!blocks.length) return null;
  return <div className="space-y-3">{blocks}</div>;
}

function InlineBold({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = /^\*\*([^*]+)\*\*$/.exec(p);
        if (m) {
          return (
            <strong key={i} className="font-semibold text-white">
              {m[1]}
            </strong>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
