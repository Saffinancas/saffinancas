import { Heart, Baby, Home, Users } from "lucide-react";

const cases = [
  {
    icon: Heart,
    title: "Casal jovem",
    desc: "Dois pagadores, contas dividas no Pix. A briga sobre 'pra onde foi o dinheiro' acaba antes de começar.",
  },
  {
    icon: Baby,
    title: "Família com filhos",
    desc: "Mercado, escola, médico, lazer. Cada categoria com teto, cada mês com um plano — e ninguém precisa abrir app.",
  },
  {
    icon: Home,
    title: "Pais e filhos adultos",
    desc: "Três gerações morando junto. A IA aprende quem paga o quê e organiza por pessoa, mantendo o pote único.",
  },
  {
    icon: Users,
    title: "Irmãos dividindo casa",
    desc: "Aluguel, contas, mercado. Quem ainda não pagou aparece no checklist mensal — sem cobrança chata, só transparência.",
  },
];

export function UseCases() {
  return (
    <section className="border-t border-[var(--color-border)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="scroll-fade max-w-2xl">
          <p className="eyebrow">Casos de uso</p>
          <h2 className="section-h2">
            Funciona pra todo{" "}
            <span className="display-serif italic font-normal">
              arranjo de família
            </span>
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cases.map((c) => (
            <div
              key={c.title}
              className="group relative isolate overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-pop"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -bottom-12 h-32 w-32 rounded-full bg-[var(--color-primary)]/8 blur-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <span className="grid h-11 w-11 place-items-center rounded-[var(--radius)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] transition-transform duration-300 group-hover:scale-110">
                <c.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-base font-semibold tracking-tight">{c.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-fg-muted)]">
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
