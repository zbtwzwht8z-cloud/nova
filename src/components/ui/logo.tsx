import * as React from "react";

import { cn } from "./utils";

// Nova = a star flaring bright. The mark is a bare four-point sparkle (a nova
// burst) in the accent green — no container tile, so it sits on whatever it's
// placed on instead of reading as a bordered box. Color comes from the design
// tokens so it tracks the theme; the favicon/app-icon variants in
// src/app/icon.svg + public/logo.svg hardcode the same shape.
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
      <path
        d="M16 3 C 16.9 12, 20.6 15.6, 29 16.5 C 20.6 17.4, 16.9 21, 16 30 C 15.1 21, 11.4 17.4, 3 16.5 C 11.4 15.6, 15.1 12, 16 3 Z"
        fill="var(--accent)"
      />
      <circle cx="25.6" cy="6.6" fill="var(--accent)" r="1.9" />
    </svg>
  );
}
