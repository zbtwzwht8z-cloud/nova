import * as React from "react";

import { fieldClass } from "./input";
import { cn } from "./utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select className={cn(fieldClass, className)} ref={ref} {...props} />
));
Select.displayName = "Select";
