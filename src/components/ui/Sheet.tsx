"use client";

import { useEffect } from "react";
import { cn } from "./cn";

export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Cerrar"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>
  );
}

export function SheetContent({
  children,
  side = "right",
  className,
}: {
  children: React.ReactNode;
  side?: "right" | "left" | "bottom";
  className?: string;
}) {
  const pos =
    side === "left"
      ? "left-0 top-0 h-full w-[420px] max-w-[90vw]"
      : side === "bottom"
        ? "bottom-0 left-0 w-full"
        : "right-0 top-0 h-full w-[420px] max-w-[90vw]";

  const shape = side === "bottom" ? "rounded-t-2xl" : "rounded-l-2xl";

  return (
    <div
      className={cn(
        "absolute border border-white/10 bg-background-deeper/90 shadow-2xl backdrop-blur-xl",
        pos,
        shape,
        className
      )}
    >
      {children}
    </div>
  );
}

