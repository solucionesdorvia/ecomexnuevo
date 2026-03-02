import { cn } from "./cn";
import { Icon } from "./Icon";

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
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        className
      )}
    >
      <Icon name="verified_user" size={16} className="text-white/80" />
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/80">{label}</span>
    </div>
  );
}

