import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { WhatsappPreview } from "./whatsapp-preview";
import { DashboardPreview } from "./dashboard-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* glow sutil de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-0 h-[600px] bg-[radial-gradient(ellipse_at_top,oklch(from_var(--color-primary)_l_c_h/0.12),transparent_60%)]"
      />
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-fg-muted)] shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              IA + WhatsApp para finanças familiares
            </div>

            <h1 className="mt-5 text-balance text-[2.4rem] leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              O grupo da sua família no <span className="text-[var(--color-primary)]">WhatsApp</span>{" "}
              agora{" "}
              <span className="display-serif italic">cuida do dinheiro</span> de vocês.
            </h1>

            <p className="mt-5 max-w-xl text-pretty text-[15.5px] leading-relaxed text-[var(--color-fg-muted)] sm:text-base">
              Cada mensagem com gasto vira despesa categorizada. Cada Pix recebido vira receita.
              Sem app pra ninguém aprender, sem planilha pra ninguém preencher.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="group">
                <Link href="/assinar">
                  Começar agora — R$ {BRAND.pricing.monthlyBRL.toFixed(2).replace(".", ",")}/mês
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="#como-funciona">Ver como funciona</Link>
              </Button>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--color-fg-subtle)]">
              <li className="flex items-center gap-1.5">
                <Dot /> {BRAND.pricing.trialDays} dias de garantia
              </li>
              <li className="flex items-center gap-1.5">
                <Dot /> Cancele quando quiser
              </li>
              <li className="flex items-center gap-1.5">
                <Dot /> Sem cartão de crédito no trial
              </li>
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[28px] bg-gradient-to-br from-[var(--color-primary-soft)] to-transparent blur-2xl opacity-60" />
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
              <WhatsappPreview />
              <DashboardPreview />
            </div>
          </div>
        </div>
      </div>
    </section>
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
