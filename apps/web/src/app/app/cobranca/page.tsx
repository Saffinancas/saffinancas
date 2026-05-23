import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { describeSubscription } from "@/lib/subscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { CreditCard, Sparkles } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plano e cobrança</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Status da sua assinatura e como adicionar meio de pagamento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Plano Família</CardTitle>
            <StatusBadge state={state.kind} />
          </div>
          <CardDescription>
            R$ {BRAND.pricing.monthlyBRL.toFixed(2).replace(".", ",")}/mês depois do trial.
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

function StatusBadge({ state }: { state: string }) {
  if (state === "active") return <Badge variant="income">ativo</Badge>;
  if (state === "trialing") return <Badge variant="primary">trial</Badge>;
  if (state === "free") return <Badge variant="income">gratuito</Badge>;
  if (state === "past_due") return <Badge variant="warning">em atraso</Badge>;
  if (state === "blocked") return <Badge variant="expense">bloqueado</Badge>;
  return <Badge variant="default">{state}</Badge>;
}
