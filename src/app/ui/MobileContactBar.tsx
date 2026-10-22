"use client";

import { useEffect, useState } from "react";
import { QuickLeadForm } from "./QuickLeadForm";

/**
 * Barra fija de contacto para celular (Etapa 1 del plan): siempre visible al pie,
 * a un toque; al tocarla despliega un panel con el formulario corto sin sacar al
 * visitante de donde está leyendo. Iguala la inmediatez que hoy solo tiene
 * WhatsApp. Oculta en escritorio (md:hidden).
 */
const P = {
  bg: "#07111A",
  bg2: "#0B1622",
  border: "rgba(255,255,255,0.08)",
  t1: "#F5F7FA",
  t2: "#A7B3C2",
  cyan: "#18C3D6",
};

export function MobileContactBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Barra fija */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 md:hidden"
        style={{
          background: `${P.bg}f2`,
          borderColor: P.border,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-lg py-3 text-[14px] font-semibold text-[#030d18] transition-all active:opacity-90"
          style={{ background: P.cyan }}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          Consultar con un especialista
        </button>
      </div>

      {/* Panel */}
      {open ? (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Consultar con un especialista"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full"
            style={{ background: "rgba(2,8,14,0.66)" }}
          />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t px-5 pt-3"
            style={{
              background: P.bg2,
              borderColor: P.border,
              paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
              animation: "ecx-sheet-up .28s cubic-bezier(.16,1,.3,1)",
            }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[16px] font-bold" style={{ color: P.t1, fontFamily: "var(--font-display)" }}>
                  Consultá tu operación
                </h2>
                <p className="mt-1 text-[13px]" style={{ color: P.t2 }}>
                  Tres datos y te responde un especialista.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 transition-colors hover:bg-white/5"
                style={{ color: P.t2 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </div>
            <QuickLeadForm variant="panel" />
          </div>
          <style>{`@keyframes ecx-sheet-up{from{transform:translateY(100%)}to{transform:translateY(0)}}@media (prefers-reduced-motion:reduce){[style*="ecx-sheet-up"]{animation:none!important}}`}</style>
        </div>
      ) : null}
    </>
  );
}
