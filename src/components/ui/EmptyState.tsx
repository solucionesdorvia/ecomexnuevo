import { cn } from "./cn";
import { ButtonLink } from "./Button";

export function EmptyState({
  icon = "inbox",
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  icon?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string; variant?: "primary" | "secondary" | "gold" };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 p-8 text-center shadow-xl",
        className
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-black/20 text-primary">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      {eyebrow ? (
        <div className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
          {eyebrow}
        </div>
      ) : null}
      <div className="mt-2 text-lg font-black tracking-tight text-white">{title}</div>
      {description ? (
        <div className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted">
          {description}
        </div>
      ) : null}
      {action ? (
        <div className="mt-6 flex justify-center">
          <ButtonLink href={action.href} variant={action.variant ?? "primary"}>
            {action.label}
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

