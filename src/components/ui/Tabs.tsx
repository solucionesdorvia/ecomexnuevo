"use client";

import { cn } from "./cn";
import { Icon } from "./Icon";

export type TabOption<T extends string> = {
  id: T;
  label: string;
  icon?: string;
};

export function Tabs<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: Array<TabOption<T>>;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-subtle bg-[color:color-mix(in_oklab,var(--surface)_88%,transparent)] p-1",
        className
      )}
      role="tablist"
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-colors",
              active
                ? "bg-[color:color-mix(in_oklab,var(--primary)_24%,transparent)] text-strong after:absolute after:bottom-0 after:left-3 after:right-3 after:h-px after:bg-[color:color-mix(in_oklab,var(--accent)_64%,white_8%)]"
                : "text-muted hover:text-strong"
            )}
          >
            {o.icon ? <Icon name={o.icon} size={16} className="text-current" /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

