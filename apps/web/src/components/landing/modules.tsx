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

const modules = [
  {
    icon: MessageSquare,
    color: "primary",
    title: "Captura via WhatsApp",
    desc: "Cada mensagem do grupo com gasto vira transação. IA classifica, você só revisa.",
    badge: "núcleo",
  },
  {
    icon: LineChart,
    color: "income",
    title: "Investimentos B3",
    desc: "Ações, FIIs, ETFs, Tesouro, CDB, fundos. Dividendos viram receita automaticamente.",
    badge: "novo",
  },
  {
    icon: Bitcoin,
    color: "warning",
    title: "Criptomoedas",
    desc: "Saldo em exchanges (Binance, Mercado Bitcoin, Coinbase…) ou em carteira própria.",
    badge: "novo",
  },
  {
    icon: Building2,
    color: "primary",
    title: "Patrimônio + aluguéis",
    desc: "Imóveis, veículos, obras. Histórico de valorização e aluguel recebido como receita.",
    badge: "novo",
  },
  {
    icon: FileCheck,
    color: "income",
    title: "Imposto de Renda",
    desc: "Restituição estimada em tempo real. Por categoria: 'plano de saúde economiza R$ X'.",
    badge: "novo",
  },
  {
    icon: Landmark,
    color: "primary",
    title: "Open Finance",
    desc: "Nubank, Inter, Itaú e outros via Pluggy. Saldo e extrato em tempo real (opcional).",
  },
  {
    icon: BrainCircuit,
    color: "primary",
    title: "BYOK opcional",
    desc: "Quando liberado, você pode usar sua própria chave de IA e a Saf cobre só a plataforma.",
    badge: "novo",
  },
  {
    icon: Gift,
    color: "income",
    title: "Plano gratuito vitalício",
    desc: "Administrativamente concedido em casos especiais. Sem trial nem cobrança.",
    badge: "novo",
  },
];

const TONE_BG: Record<string, string> = {
  primary: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
  income: "bg-[var(--color-income-soft)] text-[var(--color-income)]",
  warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
};

export function ModulesSection() {
  return (
    <section
      id="plataforma"
      className="border-t border-[var(--color-border)] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            Plataforma completa
          </p>
          <h2 className="mt-2 text-balance text-3xl tracking-tight sm:text-4xl">
            Tudo o que você precisa pra cuidar do dinheiro da família —{" "}
            <span className="display-serif italic">num lugar só.</span>
          </h2>
          <p className="mt-3 text-pretty text-[15px] leading-relaxed text-[var(--color-fg-muted)]">
            Começou como captura por WhatsApp. Cresceu pra controlar carteira de
            investimentos, patrimônio físico, aluguéis e até a sua declaração de IR. Os
            módulos conversam entre si — dividendo recebido aparece no resultado do mês e na
            ficha de rendimentos isentos do IR. Sem você fazer nada.
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <article
              key={m.title}
              className="relative rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft transition-shadow hover:shadow-pop"
            >
              {m.badge && (
                <span
                  className={
                    "absolute right-3 top-3 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider " +
                    (m.badge === "núcleo"
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                      : "bg-[var(--color-income-soft)] text-[var(--color-income)]")
                  }
                >
                  {m.badge}
                </span>
              )}
              <span
                aria-hidden
                className={
                  "inline-grid h-10 w-10 place-items-center rounded-[var(--radius)] " +
                  (TONE_BG[m.color] ?? TONE_BG.primary)
                }
              >
                <m.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-semibold tracking-tight">{m.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-fg-muted)]">
                {m.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
