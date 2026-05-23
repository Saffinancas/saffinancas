import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm text-[var(--color-fg)] outline-none transition-colors placeholder:text-[var(--color-fg-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
