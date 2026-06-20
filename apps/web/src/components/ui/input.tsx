import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "h-10 w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-fg)] outline-none shadow-ring transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[var(--color-fg-subtle)] hover:border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] focus:shadow-[0_0_0_3px_oklch(from_var(--color-primary)_l_c_h_/_0.18)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--color-danger)] aria-invalid:focus:shadow-[0_0_0_3px_oklch(from_var(--color-danger)_l_c_h_/_0.18)]",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
