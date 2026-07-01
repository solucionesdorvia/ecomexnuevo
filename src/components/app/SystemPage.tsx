import type { ReactNode } from "react";

type SystemPageProps = {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
  maxWidth?: "normal" | "wide" | "narrow" | "full";
};

const WIDTH_CLASS: Record<NonNullable<SystemPageProps["maxWidth"]>, string> = {
  narrow: "max-w-[700px]",
  normal: "max-w-[1000px]",
  wide: "max-w-[1100px]",
  full: "max-w-[1320px]",
};

export function SystemPage({ title, description, action, children, maxWidth = "normal" }: SystemPageProps) {
  return (
    <div className="relative px-safe pb-6 pt-4 sm:p-6 sm:pb-8 lg:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 sm:h-48 bg-[radial-gradient(ellipse_at_top,rgba(24,195,214,0.10),transparent_65%)]" />
      <div className={`mx-auto w-full ${WIDTH_CLASS[maxWidth]}`}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0B1622]/80 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
          {/* Línea de acento superior sutil */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#18C3D6]/25 to-transparent" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1
                className="text-[clamp(1.4rem,5vw,1.65rem)] font-extrabold leading-tight tracking-tight text-white sm:text-[26px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {title}
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#5a6577] sm:text-[14px]">{description}</p>
            </div>
            {action ? <div className="shrink-0 sm:max-w-[min(100%,280px)] sm:text-right">{action}</div> : null}
          </div>
        </div>
        <div className="mt-5 sm:mt-6">{children}</div>
      </div>
    </div>
  );
}

export function SystemKpi({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 sm:p-5 ${accent ? "border-[#18C3D6]/20 bg-[#18C3D6]/[0.04]" : "border-white/[0.04] bg-[#0B1622]"}`}>
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${accent ? "bg-[#18C3D6]/60" : "bg-[#18C3D6]/20"}`} />
      <p className="pl-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#555c6b]">{label}</p>
      <p
        className={`mt-2 pl-3 text-[clamp(1.35rem,5vw,1.75rem)] font-extrabold leading-none sm:text-[28px] ${accent ? "text-[#18C3D6]" : "text-white"}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 pl-3 text-[11px] text-[#4a5568]">{hint}</p> : null}
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
      <div className="flex items-center gap-2">
        <div className="h-px w-3 bg-[#18C3D6]/40" />
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7a8599]">{title}</h2>
      </div>
      {subtitle ? <p className="mt-1.5 text-[12px] text-[#4a5568]">{subtitle}</p> : null}
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
    <div className="rounded-xl border border-white/[0.04] bg-[#0B1622] px-5 py-10 text-center sm:p-10">
      <p className="text-[15px] font-medium text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-[14px] text-[#555c6b]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
