import {
  MessageSquare,
  LineChart,
  Bitcoin,
  Building2,
  FileCheck,
  Landmark,
  BrainCircuit,
  Gift,
} from "lucide-react";
import type { ComponentType } from "react";

type Mod = {
  icon: ComponentType<{ className?: string }>;
  tone: "primary" | "income" | "warning" | "expense" | "default";
  title: string;
  desc: string;
  badge?: "núcleo" | "novo";
  /** Span Tailwind opcional pra criar ritmo no bento. */
  span?: string;
  /** Métrica grande opcional (number-heavy). */
  metric?: string;
};

const modules: Mod[] = [
  {
    icon: MessageSquare,
    tone: "primary",
    title: "Captura via WhatsApp",
    desc: "Cada familiar vincula o WhatsApp dele e manda os gastos como já manda. IA classifica, plataforma centraliza tudo na conta da família.",
    badge: "núcleo",
    span: "sm:col-span-2 lg:col-span-2 lg:row-span-2",
    metric: "96%",
  },
  {
    icon: LineChart,
    tone: "income",
    title: "Investimentos B3",
    desc: "Ações, FIIs, ETFs, Tesouro, CDB, fundos. Dividendos viram receita.",
    badge: "novo",
  },
  {
    icon: Bitcoin,
    tone: "warning",
    title: "Criptomoedas",
    desc: "Saldo em Binance, Mercado Bitcoin, Coinbase ou carteira própria.",
    badge: "novo",
  },
  {
    icon: Building2,
    tone: "primary",
    title: "Patrimônio + aluguéis",
    desc: "Imóveis, veículos, obras. Valorização e aluguel como receita.",
    badge: "novo",
    span: "sm:col-span-2 lg:col-span-2",
  },
  {
    icon: FileCheck,
    tone: "income",
    title: "Imposto de Renda",
    desc: "Restituição estimada em tempo real. Por categoria: 'plano de saúde economiza R$ X'.",
    badge: "novo",
  },
  {
    icon: Landmark,
    tone: "primary",
    title: "Open Finance",
    desc: "Nubank, Inter, Itaú e outros via Pluggy. Saldo em tempo real (opcional).",
  },
  {
    icon: BrainCircuit,
    tone: "primary",
    title: "BYOK opcional",
    desc: "Use sua própria chave de IA. Saf cobra só a plataforma.",
    badge: "novo",
  },
  {
    icon: Gift,
    tone: "income",
    title: "Plano gratuito vitalício",
    desc: "Concedido em casos especiais. Sem trial, sem cobrança.",
    badge: "novo",
  },
];

const TONE_BG: Record<Mod["tone"], string> = {
  primary: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
  income: "bg-[var(--color-income-soft)] text-[var(--color-income)]",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  expense: "bg-[var(--color-expense-soft)] text-[var(--color-expense)]",
  default: "bg-[var(--color-surface-muted)] text-[var(--color-fg-muted)]",
};

const TONE_GRADIENT: Record<Mod["tone"], string> = {
  primary: "from-[var(--color-primary-soft)]/40 to-transparent",
  income: "from-[var(--color-income-soft)]/40 to-transparent",
  warning: "from-[var(--color-warning-soft)]/40 to-transparent",
  expense: "from-[var(--color-expense-soft)]/40 to-transparent",
  default: "from-[var(--color-surface-muted)]/40 to-transparent",
};

export function ModulesSection() {
  return (
    <section
      id="plataforma"
      className="relative border-t border-[var(--color-border)] py-20 sm:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.02] [background-image:linear-gradient(var(--color-fg)_1px,transparent_1px),linear-gradient(90deg,var(--color-fg)_1px,transparent_1px)] [background-size:40px_40px]"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Plataforma completa
          </p>
          <h2 className="mt-3 text-balance text-3xl tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-[1.1]">
            Tudo o que você precisa pra cuidar do dinheiro da família —{" "}
            <span className="display-serif italic">num lugar só.</span>
          </h2>
          <p className="mt-4 text-pretty text-[15px] leading-relaxed text-[var(--color-fg-muted)]">
            Começou como captura por WhatsApp. Cresceu pra controlar carteira de
            investimentos, patrimônio físico, aluguéis e até a sua declaração de IR.
            Os módulos conversam entre si — dividendo recebido aparece no resultado do
            mês e na ficha de rendimentos isentos do IR. Sem você fazer nada.
          </p>
        </div>

        <div className="mt-12 grid auto-rows-[200px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <article
              key={m.title}
              className={
                "group relative isolate flex flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-pop " +
                (m.span ?? "")
              }
            >
              {/* gradient sutil tom-on-hover */}
              <div
                aria-hidden
                className={
                  "pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br opacity-50 transition-opacity duration-500 group-hover:opacity-100 " +
                  TONE_GRADIENT[m.tone]
                }
              />

              {m.badge && (
                <span
                  className={
                    "absolute right-3 top-3 z-10 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] " +
                    (m.badge === "núcleo"
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                      : "bg-[var(--color-income-soft)] text-[var(--color-income)]")
                  }
                >
                  {m.badge}
                </span>
              )}

              <div>
                <span
                  aria-hidden
                  className={
                    "inline-grid h-11 w-11 place-items-center rounded-[var(--radius)] transition-transform duration-300 group-hover:scale-110 " +
                    TONE_BG[m.tone]
                  }
                >
                  <m.icon className="h-5 w-5" />
                </span>

                {m.metric && (
                  <p className="num mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {m.metric}
                    <span className="ml-1 text-sm font-normal text-[var(--color-fg-muted)]">
                      precisão IA
                    </span>
                  </p>
                )}

                <h3 className="mt-3 text-[15px] font-semibold tracking-tight">{m.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-fg-muted)]">
                  {m.desc}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
