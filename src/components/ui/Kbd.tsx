import { cn } from "./cn";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}

