import { cn } from "./cn";
import { ButtonLink } from "./Button";
import { Icon } from "./Icon";

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
  action?: { label: string; href: string; variant?: "primary" | "secondary" };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-panel rounded-2xl p-9 text-center",
        className
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <Icon name={icon} size={18} className="text-white/80" />
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
            <Icon name="arrow_forward" size={18} className="text-white/90" />
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}

