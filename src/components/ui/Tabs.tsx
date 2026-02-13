"use client";

import { cn } from "./cn";

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
        "inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1",
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
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-widest transition-colors",
              active ? "bg-white/10 text-white" : "text-muted hover:text-white"
            )}
          >
            {o.icon ? (
              <span className="material-symbols-outlined text-[16px]">{o.icon}</span>
            ) : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

