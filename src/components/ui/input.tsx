import * as React from "react";

import { cn } from "./utils";

// Shared by the text and select fields so they stay identical. Focus is a soft
// ring hugging the box rather than the browser's offset outline, which read as
// a hard second border floating around the field.
export const fieldClass =
  "h-control w-full rounded-lg border border-border bg-surface px-3.5 text-lead font-normal text-text outline-none transition-[border-color,box-shadow] duration-150 hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] focus:border-accent focus:[box-shadow:0_0_0_3px_color-mix(in_srgb,var(--accent)_16%,transparent)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-body";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input
    className={cn(fieldClass, "flex placeholder:text-text-subtle", className)}
    ref={ref}
    type={type}
    {...props}
  />
));
Input.displayName = "Input";
