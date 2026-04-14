"use client";

/** Mismo pie que /clasificarncm — pipeline completo vs rápido. */
export function ClasificarNcmPipelineFooter() {
  return (
    <footer className="relative z-10 shrink-0 border-t border-white/[0.04] px-3 py-3 sm:px-4">
      <p className="mx-auto max-w-4xl text-balance text-center text-[11px] leading-relaxed text-slate-600 sm:text-[10px]">
        Por defecto usa el pipeline completo (IA + nomenclador local + PCRAM con credenciales) para acercar el NCM a la
        posición oficial en 8 dígitos. Modo rápido solo con{" "}
        <code className="text-slate-500">NCM_CHAT_FAST_PIPELINE=1</code>. No sustituye dictamen de despachante
        matriculado.
      </p>
    </footer>
  );
}
