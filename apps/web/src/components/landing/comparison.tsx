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
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Comparativo honesto
          </p>
          <h2 className="mt-3 text-balance text-3xl tracking-tight sm:text-4xl lg:text-[2.6rem] lg:leading-[1.1]">
            O que muda em relação às{" "}
            <span className="display-serif italic">alternativas</span>
          </h2>
          <p className="mt-4 text-pretty text-[14.5px] leading-relaxed text-[var(--color-fg-muted)]">
            Lista completa do que cada produto faz. &ldquo;Apps tradicionais&rdquo; = Mobills,
            Organizze, Olho no Dinheiro etc. &ldquo;Planilhas&rdquo; = Excel/Google Sheets.
            Onde tem ⊝, significa que existe parcialmente ou só num plano caro.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-fg-subtle)]">
                <th className="px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.14em]">Recurso</th>
                <th className="relative px-3 py-4 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                  Saf Finanças
                  <span aria-hidden className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent" />
                </th>
                <th className="px-3 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.14em]">Apps tradicionais</th>
                <th className="px-3 py-4 text-center text-[11px] font-semibold uppercase tracking-[0.14em]">Planilhas</th>
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
                  <td className="px-5 py-3 text-[13.5px] text-[var(--color-fg)]">{r.f}</td>
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

        <p className="mt-6 text-xs text-[var(--color-fg-subtle)]">
          Comparação atualizada em 2026-05-19. Vai mudar conforme novos módulos saem — você
          pode acompanhar o roadmap na nossa página de status.
        </p>
      </div>
    </section>
  );
}
