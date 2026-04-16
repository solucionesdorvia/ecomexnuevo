/** Orden fijo del pipeline (debe coincidir con el enum Prisma). */
export const OPERATION_STAGE_ORDER = [
  "INICIADA",
  "ORDEN_COMPRA",
  "EMBARQUE",
  "ADUANA",
  "ENTREGA",
  "COMPLETADA",
] as const;

export const OPERATION_STAGE_LABEL_ES: Record<(typeof OPERATION_STAGE_ORDER)[number], string> = {
  INICIADA: "Iniciada",
  ORDEN_COMPRA: "Orden de compra",
  EMBARQUE: "Embarque",
  ADUANA: "Aduana",
  ENTREGA: "Entrega",
  COMPLETADA: "Completada",
};

/** Badge de etapa (punto 5 / especificación). */
export function operationStageBadgeClass(stage: string): string {
  switch (stage) {
    case "INICIADA":
      return "bg-slate-600/30 text-slate-200 border-slate-500/30";
    case "ORDEN_COMPRA":
      return "bg-blue-600/25 text-blue-200 border-blue-500/35";
    case "EMBARQUE":
      return "bg-amber-500/20 text-amber-200 border-amber-500/35";
    case "ADUANA":
      return "bg-orange-500/20 text-orange-200 border-orange-500/35";
    case "ENTREGA":
      return "bg-emerald-400/15 text-emerald-200 border-emerald-400/35";
    case "COMPLETADA":
      return "bg-emerald-600/30 text-emerald-100 border-emerald-500/40";
    default:
      return "bg-white/[0.06] text-[#b0b8c9] border-white/[0.08]";
  }
}
