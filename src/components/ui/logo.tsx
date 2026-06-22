import * as React from "react";

import { cn } from "./utils";

// Nova = a star flaring bright. The mark is a four-point sparkle (a nova
// burst) in white on the accent square. Colors come from the design tokens so
// it tracks the theme; the favicon/app-icon variants in src/app/icon.svg +
// public/logo.svg hardcode the same shape.
export function Logo({
  size = 28,
  className,
  title = "Nova"
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
      height={size}
      role={title ? "img" : undefined}
      viewBox="0 0 32 32"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <rect fill="var(--accent)" height="32" rx="8" width="32" />
      <path
        d="M16 5 C 16.8 12, 20 15.2, 27 16 C 20 16.8, 16.8 20, 16 27 C 15.2 20, 12 16.8, 5 16 C 12 15.2, 15.2 12, 16 5 Z"
        fill="var(--accent-foreground)"
      />
      <circle cx="23.4" cy="8.6" fill="var(--accent-foreground)" r="1.5" />
    </svg>
  );
}
