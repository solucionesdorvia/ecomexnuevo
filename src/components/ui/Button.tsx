import Link from "next/link";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "gold";

function classesForVariant(v: Variant) {
  if (v === "gold") {
    return "bg-gold text-black shadow-lg shadow-gold/20 hover:bg-[#e0bf4d]";
  }
  if (v === "primary") {
    return "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90";
  }
  if (v === "secondary") {
    return "border border-white/10 bg-white/5 text-white hover:bg-white/10";
  }
  return "text-white/80 hover:text-white";
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors active:scale-95";

export function Button({
  children,
  variant = "primary",
  className,
  type = "button",
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  variant?: Variant;
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
      className={cn(base, classesForVariant(variant), disabled && "opacity-60", className)}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(base, classesForVariant(variant), className)}>
      {children}
    </Link>
  );
}

