import { Users, BrainCircuit, FileCheck, Building2 } from "lucide-react";

const items = [
  {
    icon: Users,
    title: "Família toda contribui sem esforço",
    desc: "Uma assinatura cobre o núcleo inteiro. Marido, esposa, mãe, irmão — todos no mesmo grupo do WhatsApp, todos no mesmo dashboard.",
    accent: "var(--color-primary)",
  },
  {
    icon: BrainCircuit,
    title: "IA flexível — Saf paga ou você usa a sua",
    desc: "Por padrão, a Saf cobre o custo da IA na sua mensalidade. Se preferir, traga sua chave da Anthropic, OpenAI ou Google — custo direto no provedor.",
    accent: "var(--color-income)",
  },
  {
    icon: FileCheck,
    title: "Pronto pra Imposto de Renda",
    desc: "Cada gasto em saúde, educação ou doação aparece com a estimativa de quanto você vai economizar no IR. Pré-prévia da declaração o ano inteiro.",
    accent: "var(--color-warning)",
  },
  {
    icon: Building2,
    title: "Não só conta corrente — patrimônio inteiro",
    desc: "Imóveis com histórico de valorização, aluguéis recebidos, ações na B3, FIIs, criptomoedas. Tudo na mesma plataforma.",
    accent: "var(--color-primary)",
  },
];

export function Differentiators() {
  return (
    <section
      id="diferenciais"
      className="relative border-t border-[var(--color-border)] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Por que é diferente
          </p>
          <h2 className="mt-3 text-balance text-3xl tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-[1.1]">
            Os outros apps esperam disciplina.{" "}
            <span className="display-serif italic">A gente trabalha sozinho.</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <article
              key={it.title}
              className="group relative isolate overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-pop"
            >
              {/* glow accent canto */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-50"
                style={{ background: it.accent }}
              />
              {/* borda gradient on hover (top-right corner) */}
              <div
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 h-1 w-0 transition-all duration-500 group-hover:w-full"
                style={{ background: it.accent }}
              />

              <span
                className="inline-grid h-12 w-12 place-items-center rounded-[var(--radius)] transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: `color-mix(in oklch, ${it.accent} 16%, var(--color-surface))`,
                  color: it.accent,
                }}
              >
                <it.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{it.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-fg-muted)]">
                {it.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
