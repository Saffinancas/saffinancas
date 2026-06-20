import * as React from "react";
import { cn } from "@/lib/utils";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-fg-muted)]",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";
