import * as React from "react";

import { cn } from "./utils";

// Shared by the text and select fields so they stay identical.
//
// The field sits recessed rather than floating: a muted fill against the page's
// surface reads as somewhere to type, where white-on-near-white left only a
// faint hairline to carry the whole shape. On focus it lifts to the surface
// colour with a soft ring hugging the border — the browser's offset outline
// looked like a hard second border floating around the box.
export const fieldClass =
  "h-11 w-full rounded-[10px] border border-[color-mix(in_srgb,var(--border)_75%,var(--text-subtle))] bg-surface-muted px-3.5 text-lead font-normal text-text outline-none transition-[background-color,border-color,box-shadow] duration-150 hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] focus:border-accent focus:bg-surface focus:[box-shadow:0_0_0_3px_color-mix(in_srgb,var(--accent)_14%,transparent)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-body";

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
