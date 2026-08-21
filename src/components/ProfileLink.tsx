import { Link } from "@tanstack/react-router";
import type { MouseEvent, ReactNode } from "react";

export function ProfileLink({ userId, children, className, ariaLabel, stopPropagation = false }: { userId: string; children: ReactNode; className?: string; ariaLabel?: string; stopPropagation?: boolean }) {
  const stop = stopPropagation ? (event: MouseEvent) => event.stopPropagation() : undefined;
  return <Link to="/profile/$userId" params={{ userId }} className={className} aria-label={ariaLabel} onClick={stop}>{children}</Link>;
}