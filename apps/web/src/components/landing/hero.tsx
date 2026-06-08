import Link from "next/link";
import { ArrowRight, Sparkles, MessageSquare, TrendingUp, Target, PiggyBank, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { BentoCard, Sparkline, ProgressRing, Donut, PulseDot } from "./bento";

const SALDO_SERIES = [82, 78, 91, 86, 102, 95, 110, 118, 112, 124];

const CATEGORIA_SLICES = [
  { label: "Casa", value: 38, color: "var(--color-primary)" },
  { label: "Mercado", value: 27, color: "var(--color-income)" },
  { label: "Lazer", value: 18, color: "var(--color-warning)" },
  { label: "Outros", value: 17, color: "var(--color-fg-subtle)" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* gradientes vivos no fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-[640px]"
      >
        <div className="absolute left-1/4 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[var(--color-primary)]/14 blur-[120px]" />
        <div className="absolute right-1/4 top-20 h-[380px] w-[380px] translate-x-1/2 rounded-full bg-[var(--color-income)]/10 blur-[100px]" />
      </div>
      {/* grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.025] [background-image:linear-gradient(var(--color-fg)_1px,transparent_1px),linear-gradient(90deg,var(--color-fg)_1px,transparent_1px)] [background-size:32px_32px]"
      />

      <div className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1.25fr] lg:gap-14">
          {/* COLUNA ESQUERDA — pitch */}
          <div className="lg:pt-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]/60 px-3 py-1 text-xs text-[var(--color-primary)] shadow-soft backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              IA + WhatsApp pra finanças familiares
            </div>

            <h1 className="mt-5 text-balance text-[2.5rem] leading-[1.04] tracking-tight sm:text-[3.1rem] lg:text-[3.6rem]">
              O grupo da família{" "}
              <span className="text-[var(--color-primary)]">no WhatsApp</span>{" "}
              agora{" "}
              <span className="display-serif italic">cuida do dinheiro</span>{" "}
              de vocês.
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-[15.5px] leading-relaxed text-[var(--color-fg-muted)] sm:text-base">
              Cada mensagem com gasto vira despesa categorizada. Cada Pix
              recebido vira receita. Sem app pra ninguém aprender, sem planilha
              pra ninguém preencher.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="group shadow-pop">
                <Link href="/assinar">
                  Começar agora — R$ {BRAND.pricing.monthlyBRL.toFixed(2).replace(".", ",")}/mês
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="#como-funciona">Ver como funciona</Link>
              </Button>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--color-fg-subtle)]">
              <li className="flex items-center gap-1.5">
                <Dot /> {BRAND.pricing.trialDays} dias de garantia
              </li>
              <li className="flex items-center gap-1.5">
                <Dot /> Cancele quando quiser
              </li>
              <li className="flex items-center gap-1.5">
                <Dot /> Sem cartão no trial
              </li>
            </ul>

            <div className="mt-10 hidden grid-cols-3 gap-6 border-t border-[var(--color-border)] pt-6 sm:grid">
              <Stat value="96%" label="precisão IA" />
              <Stat value="< 2s" label="por mensagem" />
              <Stat value="0" label="planilha pra preencher" />
            </div>
          </div>

          {/* COLUNA DIREITA — bento dataviz */}
          <div className="relative">
            <div className="grid auto-rows-[minmax(0,_1fr)] grid-cols-2 gap-3 sm:gap-4">
              {/* Saldo (hero card) — span 2 colunas */}
              <BentoCard
                span="col-span-2"
                tone="primary"
                eyebrow="Saldo da família"
                metric={
                  <span>
                    R${" "}
                    <span className="text-[var(--color-primary)]">12.480</span>
                    ,90
                  </span>
                }
                footnote={
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-[var(--color-income)]" />
                    <span className="text-[var(--color-income)] font-medium">+4,2%</span>
                    <span>vs. mês passado</span>
                  </span>
                }
              >
                <div className="-mx-1 mt-2">
                  <Sparkline values={SALDO_SERIES} height={70} stroke="var(--color-primary)" />
                </div>
              </BentoCard>

              {/* Meta */}
              <BentoCard
                tone="income"
                eyebrow="Meta · Viagem"
                title="R$ 3.500 / 5.000"
              >
                <div className="flex items-center gap-3">
                  <ProgressRing value={70} label="da meta" color="var(--color-income)" size={78} />
                  <div className="text-[11px] leading-tight text-[var(--color-fg-muted)]">
                    <p className="font-medium text-[var(--color-fg)]">No ritmo</p>
                    <p>conclui em ~2 meses</p>
                  </div>
                </div>
              </BentoCard>

              {/* Categorias donut */}
              <BentoCard eyebrow="Onde foi" title="Categorias do mês">
                <Donut slices={CATEGORIA_SLICES} size={84} />
              </BentoCard>

              {/* WhatsApp live capture — span 2 */}
              <BentoCard
                span="col-span-2"
                eyebrow={
                  <span className="inline-flex items-center gap-1.5">
                    <PulseDot color="var(--color-income)" /> AO VIVO · WhatsApp
                  </span>
                }
                title={null}
              >
                <ul className="flex flex-col gap-2">
                  <MsgRow
                    name="Camila"
                    hue={200}
                    text="paguei 320 no mercado agora"
                    time="13:42"
                    tagTone="expense"
                    tagAmount="R$ 320,00"
                    tagCategory="Mercado"
                  />
                  <MsgRow
                    name="Pedro"
                    hue={25}
                    text="caiu Pix do freela, 1.850 ✨"
                    time="14:05"
                    tagTone="income"
                    tagAmount="R$ 1.850,00"
                    tagCategory="Renda extra"
                  />
                </ul>
              </BentoCard>

              {/* Mini cards */}
              <BentoCard tone="warning" eyebrow="Investimentos" title={null}>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="num text-xl font-semibold tracking-tight">
                      R$ 84.210
                    </p>
                    <p className="text-[10px] text-[var(--color-fg-muted)]">B3 + cripto + RF</p>
                  </div>
                  <PiggyBank className="h-7 w-7 text-[var(--color-warning)]" />
                </div>
                <div className="mt-2">
                  <Sparkline
                    values={[40, 42, 38, 45, 48, 47, 52, 56, 58, 62]}
                    height={36}
                    stroke="var(--color-warning)"
                  />
                </div>
              </BentoCard>

              <BentoCard eyebrow="IR estimado" title={null}>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="num text-xl font-semibold tracking-tight">
                      R$ 2.140
                    </p>
                    <p className="text-[10px] text-[var(--color-fg-muted)]">restituição prevista</p>
                  </div>
                  <Target className="h-7 w-7 text-[var(--color-fg-muted)]" />
                </div>
              </BentoCard>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="num text-2xl font-semibold tracking-tight text-[var(--color-fg)]">
        {value}
      </p>
      <p className="text-[11px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {label}
      </p>
    </div>
  );
}

function Dot() {
  return (
    <span
      aria-hidden
      className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]"
    />
  );
}

function MsgRow({
  name,
  hue,
  text,
  time,
  tagTone,
  tagAmount,
  tagCategory,
}: {
  name: string;
  hue: number;
  text: string;
  time: string;
  tagTone: "income" | "expense";
  tagAmount: string;
  tagCategory: string;
}) {
  return (
    <li className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2 pr-3 shadow-soft">
      <div
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold"
        style={{
          background: `oklch(88% 0.06 ${hue})`,
          color: `oklch(28% 0.1 ${hue})`,
        }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[11px]">
          <span className="font-semibold" style={{ color: `oklch(45% 0.12 ${hue})` }}>
            {name}
          </span>
          <span className="text-[var(--color-fg-subtle)]">·</span>
          <span className="text-[var(--color-fg-subtle)]">{time}</span>
          <CheckCheck className="h-3 w-3 text-[oklch(60%_0.15_220)]" />
        </p>
        <p className="truncate text-[12px] leading-tight">{text}</p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={
            "num text-xs font-semibold leading-tight " +
            (tagTone === "income"
              ? "text-[var(--color-income)]"
              : "text-[var(--color-expense)]")
          }
        >
          {tagTone === "income" ? "+" : "−"}
          {tagAmount}
        </p>
        <p className="text-[9px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
          IA · {tagCategory}
        </p>
      </div>
      <div className="absolute inline-flex">
        <MessageSquare className="hidden h-3 w-3 text-[var(--color-fg-subtle)]" />
      </div>
    </li>
  );
}
