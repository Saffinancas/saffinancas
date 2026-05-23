import { Users, BrainCircuit, FileCheck, Building2 } from "lucide-react";

const items = [
  {
    icon: Users,
    title: "Família toda contribui sem esforço",
    desc: "Uma assinatura cobre o núcleo inteiro. Marido, esposa, mãe, irmão — todos no mesmo grupo do WhatsApp, todos no mesmo dashboard.",
  },
  {
    icon: BrainCircuit,
    title: "IA flexível — Saf paga ou você usa a sua",
    desc: "Por padrão, a Saf cobre o custo da IA na sua mensalidade. Se preferir, traga sua chave da Anthropic, OpenAI ou Google — custo direto no provedor.",
  },
  {
    icon: FileCheck,
    title: "Pronto pra Imposto de Renda",
    desc: "Cada gasto em saúde, educação ou doação aparece com a estimativa de quanto você vai economizar no IR. Pré-prévia da declaração o ano inteiro.",
  },
  {
    icon: Building2,
    title: "Não só conta corrente — patrimônio inteiro",
    desc: "Imóveis com histórico de valorização, aluguéis recebidos, ações na B3, FIIs, criptomoedas. Tudo na mesma plataforma.",
  },
];

export function Differentiators() {
  return (
    <section
      id="diferenciais"
      className="border-t border-[var(--color-border)] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            Por que é diferente
          </p>
          <h2 className="mt-2 text-balance text-3xl tracking-tight sm:text-4xl">
            Os outros apps esperam disciplina.{" "}
            <span className="display-serif italic">A gente trabalha sozinho.</span>
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <article
              key={it.title}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft"
            >
              <span className="inline-grid h-11 w-11 place-items-center rounded-[var(--radius)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <it.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{it.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--color-fg-muted)]">
                {it.desc}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
