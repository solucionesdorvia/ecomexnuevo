"use client";

export function TypingIndicator() {
  return (
    <div
      className="flex min-w-0 w-full gap-3"
      aria-busy="true"
      aria-label="Procesando consulta"
    >
      <div className="mt-[5px] w-[2px] shrink-0 self-stretch rounded-full bg-[#18C3D6]/20">
        <div className="w-full h-6 rounded-full bg-[#18C3D6]/40 animate-pulse" />
      </div>
      <div className="flex items-center gap-2 py-1">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#18C3D6]/70"
          style={{ animation: "ecomex-dot-pulse 1.2s 0ms ease-in-out infinite" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#18C3D6]/70"
          style={{ animation: "ecomex-dot-pulse 1.2s 200ms ease-in-out infinite" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#18C3D6]/70"
          style={{ animation: "ecomex-dot-pulse 1.2s 400ms ease-in-out infinite" }}
        />
        <span className="ml-1 text-[12px] font-medium text-slate-500">Procesando…</span>
      </div>
    </div>
  );
}
