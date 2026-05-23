import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";

const barData = [
  { m: "jun", in: 62, out: 48 },
  { m: "jul", in: 70, out: 55 },
  { m: "ago", in: 58, out: 51 },
  { m: "set", in: 75, out: 60 },
  { m: "out", in: 80, out: 62 },
  { m: "nov", in: 72, out: 70 },
  { m: "dez", in: 95, out: 78 },
  { m: "jan", in: 68, out: 65 },
  { m: "fev", in: 76, out: 58 },
  { m: "mar", in: 82, out: 71 },
  { m: "abr", in: 88, out: 64 },
  { m: "mai", in: 91, out: 73 },
];

export function DashboardPreview() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-pop">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
            Maio · 2026
          </p>
          <p className="mt-0.5 text-sm font-semibold">Resumo da família</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-income-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-income)]">
          <TrendingUp className="h-3 w-3" /> +12% vs média
        </span>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Kpi label="Receita" value="9.180" tone="income" arrow="up" />
        <Kpi label="Despesa" value="7.342" tone="expense" arrow="down" />
        <Kpi label="Resultado" value="1.838" tone="primary" arrow="up" />
      </div>

      {/* mini gráfico 12 meses */}
      <div className="mt-5">
        <p className="text-[11px] text-[var(--color-fg-subtle)]">Últimos 12 meses</p>
        <svg viewBox="0 0 360 110" className="mt-2 h-24 w-full">
          {barData.map((d, i) => {
            const x = i * 28 + 4;
            const inH = d.in;
            const outH = d.out;
            return (
              <g key={d.m}>
                <rect
                  x={x}
                  y={100 - inH}
                  width={10}
                  height={inH}
                  rx={2}
                  fill="var(--color-income)"
                  opacity={0.9}
                />
                <rect
                  x={x + 12}
                  y={100 - outH}
                  width={10}
                  height={outH}
                  rx={2}
                  fill="var(--color-expense)"
                  opacity={0.85}
                />
                <text
                  x={x + 11}
                  y={108}
                  textAnchor="middle"
                  fontSize="7"
                  fill="var(--color-fg-subtle)"
                >
                  {d.m}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* últimas transações */}
      <div className="mt-4 space-y-1.5">
        {[
          { tag: "🛒", who: "Camila", desc: "Mercado Extra", v: "−R$ 320,00", tone: "expense" },
          { tag: "💸", who: "Pedro", desc: "Pix freelance", v: "+R$ 1.850,00", tone: "income" },
          { tag: "💊", who: "Vó Ana", desc: "Farmácia", v: "−R$ 67,40", tone: "expense" },
        ].map((t, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-[var(--radius)] bg-[var(--color-surface-muted)] px-2.5 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{t.tag}</span>
              <div className="leading-tight">
                <p className="text-[12px] font-medium">{t.desc}</p>
                <p className="text-[10px] text-[var(--color-fg-subtle)]">{t.who} · WhatsApp</p>
              </div>
            </div>
            <span
              className={
                "tabular text-[12px] font-semibold " +
                (t.tone === "income" ? "text-[var(--color-income)]" : "text-[var(--color-expense)]")
              }
            >
              {t.v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  arrow,
}: {
  label: string;
  value: string;
  tone: "income" | "expense" | "primary";
  arrow: "up" | "down";
}) {
  const toneClass =
    tone === "income"
      ? "text-[var(--color-income)]"
      : tone === "expense"
        ? "text-[var(--color-expense)]"
        : "text-[var(--color-primary)]";
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-fg-subtle)]">{label}</p>
      <p className={"display-serif tabular mt-1 text-xl leading-none " + toneClass}>
        <span className="text-[11px] align-top mr-0.5 not-italic">R$</span>
        {value}
      </p>
      <span className="mt-1 inline-flex items-center gap-0.5 text-[9.5px] text-[var(--color-fg-subtle)]">
        {arrow === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        este mês
      </span>
    </div>
  );
}
