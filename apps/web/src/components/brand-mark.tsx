import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-[8px] bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-soft"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 9v.01M12 15v.01" />
        </svg>
      </span>
      <span className="text-base font-semibold tracking-tight">{BRAND.name}</span>
    </div>
  );
}
