"use client";

/** Render mínimo: **negrita** y saltos de línea. Sin HTML crudo. */
export function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  if (!lines.length) return null;
  return (
    <div className="space-y-2">
      {lines.map((line, li) => (
        <p key={li} className="leading-relaxed">
          <InlineBold text={line} />
        </p>
      ))}
    </div>
  );
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
