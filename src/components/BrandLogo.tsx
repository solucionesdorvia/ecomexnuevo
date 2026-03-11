import Image from "next/image";
import { cn } from "@/components/ui/cn";

export function BrandLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/ecomex-logo.png"
      alt="E-COMEX"
      width={576}
      height={139}
      priority={priority}
      className={cn("h-8 w-auto", className)}
    />
  );
}
