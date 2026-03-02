import { cn } from "./cn";
import { Icon } from "./Icon";

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  right,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {eyebrow ? (
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgba(196,214,242,0.64)]">
          {eyebrow}
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {icon ? (
              <Icon name={icon} size={20} className="text-[#a8cbff]" />
            ) : null}
            <h1 className="truncate text-3xl font-semibold tracking-tight text-[#edf4ff] md:text-4xl">
              {title}
            </h1>
          </div>
          {subtitle ? (
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[rgba(201,218,244,0.66)] md:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

