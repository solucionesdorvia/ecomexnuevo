import { cn } from "./cn";

export function SealVerified({
  label = "Verificado por IA",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/20 px-3 py-1.5",
        className
      )}
    >
      <span className="material-symbols-outlined text-[16px] text-gold">
        verified
      </span>
      <span className="gold-gradient-text text-[10px] font-black uppercase tracking-[0.2em]">
        {label}
      </span>
    </div>
  );
}

