"use client";

import { useId, useState } from "react";
import { cn } from "./cn";

export function Tooltip({
  content,
  children,
  className,
}: {
  content: string;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open ? (
        <span
          id={id}
          role="tooltip"
          className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-background-deeper/90 px-3 py-2 text-[11px] font-semibold text-white shadow-2xl backdrop-blur-xl"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}

