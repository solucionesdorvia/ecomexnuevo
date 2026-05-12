"use client";

export function TypingIndicator() {
  return (
    <div
      className="msg-in-assistant flex min-w-0 w-full items-start gap-2.5"
      aria-busy="true"
      aria-label="Procesando consulta"
    >
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#18C3D6]/20 bg-[#060f1a]">
        <img
          src="/brand/ecomex-logo.png"
          alt=""
          className="h-2 brightness-0 invert opacity-50"
          aria-hidden
        />
      </div>
      <div className="flex min-w-0 flex-1 items-stretch gap-3">
        <div className="mt-[3px] w-[2px] shrink-0 self-stretch rounded-full bg-[#18C3D6]/20">
          <div className="h-4 w-full animate-pulse rounded-full bg-[#18C3D6]/40" />
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
    </div>
  );
}
