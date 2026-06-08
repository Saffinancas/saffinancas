import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho padrão de página interna (app + admin).
 *
 * Eyebrow uppercase tracking 0.18em (consistente com landing),
 * h1 com display-serif italic opcional para ênfase, descrição enxuta,
 * slot pra ações no canto direito (botão "novo", etc.).
 */
type PageHeaderProps = {
  /** Texto sobre o título, ex.: "Plataforma · Dashboard". */
  eyebrow?: React.ReactNode;
  /** Título principal — string ou ReactNode (pra spans estilizados). */
  title: React.ReactNode;
  /** Descrição curta logo abaixo do título. */
  description?: React.ReactNode;
  /** Ações no canto direito (Button, etc.). */
  actions?: React.ReactNode;
  /** Tons de gradient de fundo do glow atrás do título. */
  tone?: "primary" | "income" | "warning" | "expense" | "none";
  className?: string;
};

const TONE_GLOW: Record<NonNullable<PageHeaderProps["tone"]>, string> = {
  primary: "bg-[var(--color-primary)]/12",
  income: "bg-[var(--color-income)]/12",
  warning: "bg-[var(--color-warning)]/14",
  expense: "bg-[var(--color-expense)]/12",
  none: "bg-transparent",
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  tone = "primary",
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("relative isolate", className)}>
      {tone !== "none" && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -top-12 left-0 -z-10 h-44 w-44 rounded-full blur-[80px]",
            TONE_GLOW[tone],
          )}
        />
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-[var(--color-fg-muted)]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * Card pequeno com métrica em destaque. Use para KPIs no topo de uma página.
 */
type StatCardProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Texto auxiliar abaixo (delta, comparativo). */
  trend?: React.ReactNode;
  /** Tom do card. */
  tone?: "default" | "primary" | "income" | "warning" | "expense";
  /** Ícone à direita do label (opcional). */
  icon?: React.ReactNode;
  /** Sparkline ou conteúdo gráfico embaixo. */
  chart?: React.ReactNode;
  className?: string;
};

const STAT_TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "from-[var(--color-surface)] to-[var(--color-surface)]",
  primary:
    "from-[var(--color-primary-soft)]/60 to-[var(--color-surface)] ring-[var(--color-primary)]/10",
  income:
    "from-[var(--color-income-soft)]/60 to-[var(--color-surface)] ring-[var(--color-income)]/10",
  warning:
    "from-[var(--color-warning-soft)]/60 to-[var(--color-surface)] ring-[var(--color-warning)]/10",
  expense:
    "from-[var(--color-expense-soft)]/60 to-[var(--color-surface)] ring-[var(--color-expense)]/10",
};

export function StatCard({
  label,
  value,
  trend,
  tone = "default",
  icon,
  chart,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "group relative isolate overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-gradient-to-br p-5 ring-1 ring-transparent shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop",
        STAT_TONE[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
          {label}
        </p>
        {icon && <span className="shrink-0 text-[var(--color-fg-muted)]">{icon}</span>}
      </div>
      <p className="num mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        {value}
      </p>
      {trend && (
        <p className="mt-1 text-[11px] leading-tight text-[var(--color-fg-muted)]">{trend}</p>
      )}
      {chart && <div className="mt-3 -mx-1">{chart}</div>}
    </div>
  );
}

/**
 * Section divisora entre blocos de conteúdo em uma página interna.
 */
type SectionProps = React.HTMLAttributes<HTMLDivElement> & {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
};

export function Section({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      {...rest}
      className={cn("space-y-4", className)}
    >
      {(eyebrow || title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {eyebrow && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">{title}</h2>
            )}
            {description && (
              <p className="mt-1 max-w-2xl text-[13px] text-[var(--color-fg-muted)]">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
