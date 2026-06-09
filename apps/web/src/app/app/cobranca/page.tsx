import * as React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { describeSubscription } from "@/lib/subscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { PulseDot } from "@/components/ui/bento";
import { BRAND } from "@/lib/brand";
import { getPricing } from "@/lib/pricing";
import { CalendarClock, CreditCard, ShieldCheck, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CobrancaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.familyId, familyId))
    .limit(1);

  const state = describeSubscription(sub);
  const pricing = await getPricing();
  const monthlyBRL = pricing.monthlyCents / 100;

  const tone = toneForState(state.kind);
  const statusLabel = humanStatus(state.kind);
  const planPriceBRL = `R$ ${monthlyBRL.toFixed(2).replace(".", ",")}`;
  const nextBillingLabel =
    state.kind === "active" && state.nextBillingAt
      ? new Date(state.nextBillingAt).toLocaleDateString("pt-BR")
      : state.kind === "trialing"
        ? state.daysLeft === 0
          ? "hoje"
          : `em ${state.daysLeft} dia${state.daysLeft === 1 ? "" : "s"}`
        : state.kind === "free"
          ? "—"
          : state.kind === "past_due"
            ? "pendente"
            : "—";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Painel · Plano e cobrança"
        title={
          <>
            Seu plano, sua{" "}
            <span className="display-serif italic">tranquilidade</span>
          </>
        }
        description="Status da assinatura e meio de pagamento — tudo num lugar só."
        tone={tone}
      />

      <div className="grid auto-rows-[minmax(120px,_auto)] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard
          tone={tone === "expense" ? "expense" : tone === "warning" ? "warning" : "primary"}
          label="Status"
          value={
            <span className="inline-flex items-center gap-2 text-xl sm:text-2xl">
              <PulseDot color={pulseColor(state.kind)} />
              {statusLabel}
            </span>
          }
          icon={<ShieldCheck className="h-4 w-4" />}
          trend={trendForState(state)}
        />
        <StatCard
          tone="default"
          label="Mensalidade"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {monthlyBRL.toFixed(2).replace(".", ",")}
            </span>
          }
          icon={<CreditCard className="h-4 w-4" />}
          trend={
            state.kind === "free"
              ? "cortesia vitalícia"
              : `após ${BRAND.pricing.trialDays} dias de trial`
          }
        />
        <StatCard
          tone={state.kind === "past_due" ? "expense" : "default"}
          label="Próxima cobrança"
          value={<span className="num text-xl sm:text-2xl">{nextBillingLabel}</span>}
          icon={<CalendarClock className="h-4 w-4" />}
          trend={state.kind === "active" ? "renovação automática" : "sem cobrança ativa"}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Plano Família</CardTitle>
            <StatusBadge state={state.kind} />
          </div>
          <CardDescription>
            {planPriceBRL}/mês depois do trial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {state.kind === "free" && (
            <div className="rounded-[var(--radius)] border border-[var(--color-income)]/30 bg-[var(--color-income-soft)]/60 p-4">
              <p className="font-semibold text-[var(--color-income)]">
                Plano gratuito vitalício.
              </p>
              <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
                Cortesia concedida pela administração. Sem trial, sem cobrança, sem
                bloqueio. Se um dia mudarmos, avisamos antes.
              </p>
            </div>
          )}
          {state.kind === "trialing" && (
            <p>
              Você está no trial gratuito de {BRAND.pricing.trialDays} dias.{" "}
              <strong>
                {state.daysLeft === 0
                  ? "Termina hoje."
                  : state.daysLeft === 1
                    ? "Mais 1 dia."
                    : `Mais ${state.daysLeft} dias.`}
              </strong>{" "}
              Adicione um cartão pra continuar usando depois.
            </p>
          )}
          {state.kind === "active" && (
            <p>
              Assinatura ativa.{" "}
              {state.nextBillingAt
                ? `Próxima cobrança em ${new Date(state.nextBillingAt).toLocaleDateString(
                    "pt-BR",
                  )}.`
                : ""}
            </p>
          )}
          {state.kind === "past_due" && (
            <p className="text-[var(--color-expense)]">
              Pagamento pendente há {state.daysSince}{" "}
              dia{state.daysSince === 1 ? "" : "s"}. Acesso será suspenso em{" "}
              {state.daysUntilBlock} dia{state.daysUntilBlock === 1 ? "" : "s"}.
            </p>
          )}

          {state.kind !== "free" && (
            <>
              <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-3 text-xs text-[var(--color-warning)]">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Checkout em modo simulado</p>
                  <p className="mt-0.5">
                    A integração com Pagar.me ainda está stub. Quando você plugar a chave da API no
                    .env (<code>PAGARME_API_KEY</code>), o botão abaixo passa a cobrar de verdade.
                  </p>
                </div>
              </div>

              <Button asChild>
                <Link href="/app/cobranca/cartao">
                  <CreditCard className="h-4 w-4" /> Adicionar cartão (simulado)
                </Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type SubState = ReturnType<typeof describeSubscription>;

function toneForState(kind: SubState["kind"]): "primary" | "income" | "warning" | "expense" {
  switch (kind) {
    case "active":
    case "free":
      return "income";
    case "trialing":
      return "primary";
    case "past_due":
      return "warning";
    case "blocked":
      return "expense";
    default:
      return "primary";
  }
}

function humanStatus(kind: SubState["kind"]): string {
  switch (kind) {
    case "active":
      return "Ativo";
    case "trialing":
      return "Trial";
    case "free":
      return "Gratuito";
    case "past_due":
      return "Em atraso";
    case "blocked":
      return "Bloqueado";
    default:
      return kind;
  }
}

function pulseColor(kind: SubState["kind"]): string {
  switch (kind) {
    case "active":
    case "free":
      return "var(--color-income)";
    case "trialing":
      return "var(--color-primary)";
    case "past_due":
      return "var(--color-warning)";
    case "blocked":
      return "var(--color-expense)";
    default:
      return "var(--color-primary)";
  }
}

function trendForState(state: SubState): React.ReactNode {
  if (state.kind === "trialing") {
    return state.daysLeft === 0
      ? "termina hoje"
      : state.daysLeft === 1
        ? "mais 1 dia"
        : `mais ${state.daysLeft} dias`;
  }
  if (state.kind === "past_due") {
    return `bloqueio em ${state.daysUntilBlock} dia${state.daysUntilBlock === 1 ? "" : "s"}`;
  }
  if (state.kind === "free") return "cortesia da administração";
  if (state.kind === "active") return "renovação automática";
  if (state.kind === "blocked") return "acesso suspenso";
  return null;
}

function StatusBadge({ state }: { state: string }) {
  if (state === "active") return <Badge variant="income">ativo</Badge>;
  if (state === "trialing") return <Badge variant="primary">trial</Badge>;
  if (state === "free") return <Badge variant="income">gratuito</Badge>;
  if (state === "past_due") return <Badge variant="warning">em atraso</Badge>;
  if (state === "blocked") return <Badge variant="expense">bloqueado</Badge>;
  return <Badge variant="default">{state}</Badge>;
}
