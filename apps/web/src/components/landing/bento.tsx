import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Primitivos visuais usados nos bento cards da landing.
 * Tudo SVG puro (zero dependências). Server components.
 */

// ---------- Card ----------

type BentoCardProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  /** Span Tailwind opcional (ex: "lg:col-span-2 lg:row-span-2"). */
  span?: string;
  /** Tom de destaque do card. */
  tone?: "default" | "primary" | "income" | "warning" | "expense";
  /** Texto pequeno no topo do card. */
  eyebrow?: React.ReactNode;
  /** Heading principal. */
  title?: React.ReactNode;
  /** Subtítulo / valor de destaque (number-heavy). */
  metric?: React.ReactNode;
  /** Texto auxiliar abaixo do metric. */
  footnote?: React.ReactNode;
  /** Conteúdo livre embaixo. */
  children?: React.ReactNode;
};

const TONE: Record<NonNullable<BentoCardProps["tone"]>, string> = {
  default:
    "from-[var(--color-surface)] to-[var(--color-surface)] hover:from-[var(--color-surface)] hover:to-[var(--color-surface-muted)]",
  primary:
    "from-[var(--color-primary-soft)] to-[var(--color-surface)] ring-[var(--color-primary)]/15",
  income:
    "from-[var(--color-income-soft)] to-[var(--color-surface)] ring-[var(--color-income)]/15",
  warning:
    "from-[var(--color-warning-soft)] to-[var(--color-surface)] ring-[var(--color-warning)]/15",
  expense:
    "from-[var(--color-expense-soft)] to-[var(--color-surface)] ring-[var(--color-expense)]/15",
};

export function BentoCard({
  className,
  span,
  tone = "default",
  eyebrow,
  title,
  metric,
  footnote,
  children,
  ...rest
}: BentoCardProps) {
  return (
    <div
      {...rest}
      className={cn(
        "group relative isolate overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-gradient-to-br p-5 ring-1 ring-transparent shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop",
        TONE[tone],
        span,
        className,
      )}
    >
      {/* glow sutil no canto */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[var(--color-primary)]/8 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      {eyebrow && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
          {eyebrow}
        </p>
      )}
      {title && (
        <h3 className="mt-1 text-sm font-semibold tracking-tight text-[var(--color-fg)]">
          {title}
        </h3>
      )}
      {metric && (
        <p className="num mt-2 text-2xl font-semibold leading-tight tracking-tight text-[var(--color-fg)] sm:text-3xl">
          {metric}
        </p>
      )}
      {footnote && (
        <p className="mt-1 text-[11px] leading-tight text-[var(--color-fg-muted)]">
          {footnote}
        </p>
      )}
      {children && <div className="relative mt-3">{children}</div>}
    </div>
  );
}

// ---------- Sparkline ----------

type SparklineProps = {
  values: number[];
  height?: number;
  /** Cor da linha; default usa accent income. */
  stroke?: string;
  className?: string;
};

export function Sparkline({
  values,
  height = 56,
  stroke = "var(--color-income)",
  className,
}: SparklineProps) {
  const w = 200;
  const h = height;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => [i * step, h - ((v - min) / range) * (h - 8) - 4] as const);

  const linePath = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  const last = points[points.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-grad)" />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={3.5} fill={stroke} />
      <circle cx={last[0]} cy={last[1]} r={6} fill={stroke} fillOpacity={0.18} />
    </svg>
  );
}

// ---------- Donut ----------

type DonutSlice = { label: string; value: number; color: string };

export function Donut({ slices, size = 96 }: { slices: DonutSlice[]; size?: number }) {
  const radius = 40;
  const stroke = 16;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
          opacity={0.4}
        />
        {slices.map((s) => {
          const len = (s.value / total) * circumference;
          const dashArray = `${len} ${circumference - len}`;
          const el = (
            <circle
              key={s.label}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={dashArray}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 50 50)"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <ul className="flex flex-col gap-1 text-[11px]">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="block h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-[var(--color-fg-muted)]">{s.label}</span>
            <span className="num font-medium text-[var(--color-fg)]">
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- ProgressRing ----------

export function ProgressRing({
  value,
  label,
  color = "var(--color-primary)",
  size = 88,
}: {
  value: number; // 0..100
  label?: string;
  color?: string;
  size?: number;
}) {
  const radius = 40;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(Math.max(value, 0), 100) / 100) * circumference;

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90" width={size} height={size} aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={stroke}
          opacity={0.45}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="num text-base font-semibold leading-none">{Math.round(value)}%</p>
          {label && (
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
              {label}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Pulse / live dot ----------

export function PulseDot({ color = "var(--color-income)" }: { color?: string }) {
  return (
    <span className="relative inline-grid h-2.5 w-2.5 place-items-center" aria-hidden>
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
        style={{ background: color }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ background: color }}
      />
    </span>
  );
}
