import * as React from "react";
import { cn } from "./cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-xl border border-subtle bg-[var(--surface)] px-3 text-sm text-strong placeholder:text-muted/70 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors focus-visible:border-[color:color-mix(in_oklab,var(--primary)_44%,white_8%)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
});

