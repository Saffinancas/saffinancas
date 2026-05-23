import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-fg-muted)]",
        primary:
          "border-transparent bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
        income:
          "border-transparent bg-[var(--color-income-soft)] text-[var(--color-income)]",
        expense:
          "border-transparent bg-[var(--color-expense-soft)] text-[var(--color-expense)]",
        warning:
          "border-transparent bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
