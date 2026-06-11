import { QrCode, Sparkles, LineChart, ArrowRight } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: QrCode,
    title: "Cada membro vincula o WhatsApp dele",
    desc: "Gera um código de 6 letras na plataforma. Cada familiar manda `vincular CÓDIGO` pro número Saf — do WhatsApp dele(a). Mãe, pai, filho, irmão — todos no mesmo cadastro.",
    accent: "var(--color-primary)",
  },
  {
    n: "02",
    icon: Sparkles,
    title: "A IA classifica tudo",
    desc: "Cada mensagem com gasto vira transação: valor, descrição, categoria. Áudios e comprovantes também — Whisper + OCR fazem o resto.",
    accent: "var(--color-income)",
  },
  {
    n: "03",
    icon: LineChart,
    title: "A família vê tudo centralizado",
    desc: "Receita, despesa e resultado consolidados — não importa quem mandou. Histórico de 12 meses, drill-down por pessoa ou categoria, projeção do mês que vem.",
    accent: "var(--color-warning)",
  },
];

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="relative border-t border-[var(--color-border)] bg-[var(--color-bg-muted)] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Como funciona
          </p>
          <h2 className="mt-3 text-balance text-3xl tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-[1.1]">
            Três passos.{" "}
            <span className="display-serif italic">Nenhum esforço</span> depois disso.
          </h2>
        </div>

        <div className="relative mt-12">
          {/* linha conectora desktop */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-12 top-12 hidden h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent md:block"
          />
          <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.n}
              className="group relative isolate overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-pop"
            >
              {/* glow accent canto sup direito */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
                style={{ background: s.accent }}
              />

              <div className="flex items-start justify-between">
                <span className="display-serif text-5xl leading-none text-[var(--color-fg-subtle)]/40 transition-colors group-hover:text-[var(--color-primary)]/60">
                  {s.n}
                </span>
                <span
                  className="grid h-11 w-11 place-items-center rounded-[var(--radius)] transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: `color-mix(in oklch, ${s.accent} 18%, var(--color-surface))`,
                    color: s.accent,
                  }}
                >
                  <s.icon className="h-5 w-5" />
                </span>
              </div>

              <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-fg-muted)]">
                {s.desc}
              </p>

              {i < steps.length - 1 && (
                <ArrowRight
                  aria-hidden
                  className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-[var(--color-border)] md:block"
                />
              )}
            </li>
          ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
