import Link from "next/link";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg";

function classesForVariant(v: Variant) {
  if (v === "primary") {
    return "relative isolate overflow-hidden border border-[color:color-mix(in_oklab,var(--primary)_58%,white_12%)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_84%,white_8%),var(--primary2))] text-[var(--text)] shadow-[var(--shadowGlow)] before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-px before:rounded-full before:bg-white/65 before:opacity-75 hover:brightness-110";
  }
  if (v === "secondary") {
    return "border border-[color:color-mix(in_oklab,var(--accent)_58%,white_8%)] bg-[color:color-mix(in_oklab,var(--accent)_14%,transparent)] text-[color:color-mix(in_oklab,var(--accent)_86%,white_10%)] hover:bg-[color:color-mix(in_oklab,var(--accent)_20%,transparent)]";
  }
  if (v === "subtle") {
    return "border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] hover:bg-[color:color-mix(in_oklab,var(--surface2)_90%,white_8%)]";
  }
  if (v === "danger") {
    return "border border-red-400/30 bg-red-500/15 text-red-100 hover:bg-red-500/25";
  }
  return "border border-transparent bg-transparent text-[var(--muted)] hover:bg-[color:color-mix(in_oklab,var(--surface2)_84%,transparent)] hover:text-[var(--text)]";
}

function classesForSize(size: Size) {
  if (size === "sm") return "h-9 rounded-xl px-3 text-xs font-extrabold uppercase tracking-[0.14em]";
  if (size === "lg") return "h-12 rounded-2xl px-6 text-sm font-extrabold tracking-tight";
  return "h-10 rounded-xl px-4 text-sm font-bold tracking-tight";
}

const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-150 active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-55";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(base, classesForSize(size), classesForVariant(variant), className)}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(base, classesForSize(size), classesForVariant(variant), className)}
    >
      {children}
    </Link>
  );
}

