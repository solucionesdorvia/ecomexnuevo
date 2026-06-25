"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-lg bg-[#18C3D6] px-4 py-2 text-sm font-semibold text-[#04121a] shadow hover:bg-[#15b0c2]"
    >
      Descargar / Imprimir PDF
    </button>
  );
}
