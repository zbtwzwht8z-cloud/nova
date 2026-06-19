import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

export const buttonVariants = cva(
  "inline-flex h-control items-center justify-center gap-2 whitespace-nowrap rounded text-body-sm font-medium transition-colors hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent focus-visible:[box-shadow:none] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border border-accent bg-accent px-4 text-accent-foreground hover:opacity-90",
        secondary:
          "border border-border bg-surface px-4 text-text hover:bg-surface-muted",
        ghost:
          "border-0 [background-color:transparent] px-4 text-text-muted hover:bg-surface-muted hover:text-text"
      }
    },
    defaultVariants: {
      variant: "secondary"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, type = "button", variant, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant }), className)}
      ref={ref}
      type={type}
      {...props}
    />
  )
);
Button.displayName = "Button";
