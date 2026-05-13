import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({
  style = "brand",
  className,
  size = 18,
}: { style?: "brand" | "gold"; className?: string; size?: number }) {
  return (
    <BadgeCheck
      strokeWidth={2.4}
      className={cn(style === "gold" ? "verified-gold" : "verified-brand", className)}
      style={{ width: size, height: size }}
      aria-label="حساب موثّق"
    />
  );
}
