import { cn } from "./cn";

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg border border-white/10 bg-white/5",
        className
      )}
      aria-hidden="true"
    />
  );
}

