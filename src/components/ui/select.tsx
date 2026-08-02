import * as React from "react";
import { ChevronDown } from "lucide-react";

import { fieldClass } from "./input";
import { cn } from "./utils";

// `appearance: none` (set globally to kill Safari's inset bevel) also removes
// the native dropdown arrow, so it's drawn back here — as an element rather
// than a background image, which keeps it on the theme's text colour.
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full">
    <select className={cn(fieldClass, "pr-10", className)} ref={ref} {...props} />
    <ChevronDown
      aria-hidden="true"
      className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
    />
  </div>
));
Select.displayName = "Select";
