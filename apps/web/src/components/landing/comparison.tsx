import { Check, Minus, X } from "lucide-react";

const rows = [
  { f: "Lançamento automático via WhatsApp", us: "yes", trad: "no", plan: "no" },
  { f: "Categorização por IA", us: "yes", trad: "partial", plan: "no" },
  { f: "Família inteira contribuindo na mesma conta", us: "yes", trad: "partial", plan: "yes" },
  { f: "Open Finance (saldo banco real-time)", us: "yes", trad: "yes", plan: "no" },
  { f: "Investimentos B3 (ações, FII, RF)", us: "yes", trad: "partial", plan: "yes" },
  { f: "Criptomoedas (BTC, ETH, stablecoins)", us: "yes", trad: "no", plan: "partial" },
  { f: "Patrimônio físico (imóveis, veículos)", us: "yes", trad: "no", plan: "yes" },
  { f: "Aluguéis recebidos + reajuste", us: "yes", trad: "no", plan: "partial" },
  { f: "Imposto de Renda — restituição estimada", us: "yes", trad: "no", plan: "no" },
  { f: "Dicas por categoria (saúde → economia X)", us: "yes", trad: "no", plan: "no" },
  { f: "Bens e Direitos pré-organizado para IRPF", us: "yes", trad: "no", plan: "no" },
  { f: "Emissão de NFSe avulsa", us: "yes", trad: "no", plan: "no" },
  { f: "Agendamento de NFSe mensal automática", us: "yes", trad: "no", plan: "no" },
  { f: "Download XML + DANFE em lote (contabilidade)", us: "yes", trad: "no", plan: "no" },
  { f: "Certificado digital A1 (.pfx) gerenciado", us: "yes", trad: "no", plan: "no" },
  { f: "BYOK — cliente usa chave própria de IA", us: "yes", trad: "no", plan: "no" },
  { f: "Plano gratuito vitalício (administrativo)", us: "yes", trad: "no", plan: "no" },
  { f: "Previsibilidade do mês seguinte", us: "yes", trad: "partial", plan: "partial" },
  { f: "Não exige disciplina diária", us: "yes", trad: "no", plan: "no" },
] as const;

type Verdict = "yes" | "no" | "partial";

const TAG_TONE: Record<Verdict, string> = {
  yes: "border-[var(--color-income)]/25 bg-[var(--color-income-soft)] text-[var(--color-income)]",
  no: "border-[var(--color-expense)]/25 bg-[var(--color-expense-soft)] text-[var(--color-expense)]",
  partial:
    "border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
};

const TAG_TEXT: Record<Verdict, string> = {
  yes: "sim",
  no: "não",
  partial: "parcial",
};

function MobileTag({
  label,
  v,
  emphasis = false,
}: {
  label: string;
  v: Verdict;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col items-center gap-1 rounded-[var(--radius)] border px-2 py-2 text-center transition-colors " +
        TAG_TONE[v]
      }
    >
      <span
        className={
          "text-[9px] font-semibold uppercase tracking-[0.14em] " +
          (emphasis ? "text-[var(--color-primary)]" : "text-[var(--color-fg-subtle)]")
        }
      >
        {label}
      </span>
      <span className="flex items-center gap-1 text-[11px] font-semibold">
        {v === "yes" ? (
          <Check className="h-3 w-3" />
        ) : v === "no" ? (
          <X className="h-3 w-3" />
        ) : (
          <Minus className="h-3 w-3" />
        )}
        {TAG_TEXT[v]}
      </span>
    </div>
  );
}

function Cell({ v }: { v: "yes" | "no" | "partial" }) {
  if (v === "yes")
    return (
      <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-[var(--color-income-soft)] text-[var(--color-income)]">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  if (v === "no")
    return (
      <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-[var(--color-expense-soft)] text-[var(--color-expense)]">
        <X className="h-3.5 w-3.5" />
      </span>
    );
  return (
    <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-[var(--color-warning-soft)] text-[var(--color-warning)]">
      <Minus className="h-3.5 w-3.5" />
    </span>
  );
}

export function Comparison() {
  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-bg-muted)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="scroll-fade max-w-2xl">
          <p className="eyebrow">Comparativo honesto</p>
          <h2 className="section-h2">
            O que muda em relação às{" "}
            <span className="display-serif italic font-normal">alternativas</span>
          </h2>
          <p className="mt-4 text-pretty text-[14.5px] leading-relaxed text-[var(--color-fg-muted)]">
            Lista completa do que cada produto faz. &ldquo;Apps tradicionais&rdquo; = Mobills,
            Organizze, Olho no Dinheiro etc. &ldquo;Planilhas&rdquo; = Excel/Google Sheets.
            Onde tem ⊝, significa que existe parcialmente ou só num plano caro.
          </p>
        </div>

        {/* Desktop / tablet — tabela completa */}
        <div className="scroll-fade mt-12 hidden overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-16 z-10 bg-[var(--color-surface)]/95 backdrop-blur">
              <tr className="border-b border-[var(--color-border)] text-[var(--color-fg-subtle)]">
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.14em]">
                  Recurso
                </th>
                <th className="relative px-3 py-4 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                  Saf Finanças
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent"
                  />
                </th>
                <th className="px-3 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.14em]">
                  Apps tradicionais
                </th>
                <th className="px-3 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.14em]">
                  Planilhas
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.f}
                  className={
                    "transition-colors hover:bg-[var(--color-primary-soft)]/30 " +
                    (i % 2 === 1 ? "bg-[var(--color-bg-muted)]/60" : "")
                  }
                >
                  <td className="px-5 py-3 text-[13.5px] text-[var(--color-fg)]">
                    {r.f}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Cell v={r.us} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Cell v={r.trad} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Cell v={r.plan} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile — cards com badges (evita scroll horizontal apertado) */}
        <div className="scroll-fade mt-10 space-y-2 md:hidden">
          {rows.map((r) => (
            <div
              key={r.f}
              className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 shadow-soft"
            >
              <p className="text-[13.5px] font-medium leading-snug text-[var(--color-fg)]">
                {r.f}
              </p>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                <MobileTag
                  label="Saf"
                  v={r.us}
                  emphasis
                />
                <MobileTag label="Apps" v={r.trad} />
                <MobileTag label="Planilha" v={r.plan} />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-[var(--color-fg-subtle)]">
          Comparação atualizada em 2026-05-19. Vai mudar conforme novos módulos saem — você
          pode acompanhar o roadmap na nossa página de status.
        </p>
      </div>
    </section>
  );
}
