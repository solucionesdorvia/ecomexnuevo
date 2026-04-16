import type { ReactNode } from "react";

type SystemPageProps = {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  maxWidth?: "normal" | "wide" | "narrow";
};

const WIDTH_CLASS: Record<NonNullable<SystemPageProps["maxWidth"]>, string> = {
  narrow: "max-w-[700px]",
  normal: "max-w-[1000px]",
  wide: "max-w-[1100px]",
};

export function SystemPage({ title, description, action, children, maxWidth = "normal" }: SystemPageProps) {
  return (
    <div className="relative p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(43,89,255,0.14),transparent_65%)]" />
      <div className={`mx-auto ${WIDTH_CLASS[maxWidth]}`}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]/80 px-5 py-5 backdrop-blur sm:px-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#2b59ff]/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-10 -bottom-10 h-20 w-20 rounded-full bg-[#d4a843]/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#4a5568]">Sistema E-COMEX</p>
              <h1 className="mt-1 text-[22px] font-extrabold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
                {title}
              </h1>
              <p className="mt-1 text-[14px] text-[#555c6b]">{description}</p>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        </div>
        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SystemKpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#555c6b]">{label}</p>
      <p className="mt-2 text-[28px] font-extrabold leading-none text-white" style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </p>
      {hint ? <p className="mt-2 text-[11px] text-[#4a5568]">{hint}</p> : null}
    </div>
  );
}

export function SystemSection({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-10 ${className}`}>
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#555c6b]">{title}</h2>
      {subtitle ? <p className="mt-2 text-[13px] text-[#4a5568]">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SystemEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] p-10 text-center">
      <p className="text-[15px] font-medium text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-[14px] text-[#555c6b]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
