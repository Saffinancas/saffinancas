import { QrCode, Sparkles, LineChart } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: QrCode,
    title: "Conecta o grupo",
    desc: "Você lê um QR code com o WhatsApp de quem está no grupo da família. Em segundos, a sessão fica pareada.",
  },
  {
    n: "02",
    icon: Sparkles,
    title: "A IA classifica tudo",
    desc: "Cada mensagem vira transação: valor, descrição, categoria. Áudios e comprovantes também — Whisper + OCR fazem o resto.",
  },
  {
    n: "03",
    icon: LineChart,
    title: "Você vê o dashboard",
    desc: "Receita, despesa e resultado em tempo real. Histórico de 12 meses, drill-down por categoria, projeção do mês que vem.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="border-t border-[var(--color-border)] bg-[var(--color-bg-muted)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
            Como funciona
          </p>
          <h2 className="mt-2 text-balance text-3xl tracking-tight sm:text-4xl">
            Três passos. <span className="display-serif italic">Nenhum esforço</span> depois disso.
          </h2>
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <li
              key={s.n}
              className="group relative rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft transition-shadow hover:shadow-pop"
            >
              <div className="flex items-center justify-between">
                <span className="display-serif text-3xl text-[var(--color-fg-subtle)]">{s.n}</span>
                <span className="grid h-10 w-10 place-items-center rounded-[var(--radius)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                  <s.icon className="h-5 w-5" />
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--color-fg-muted)]">
                {s.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
