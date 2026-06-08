import { desc, eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { PageHeader, StatCard, Section } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function AdminCobrancaPage() {
  const all = await db
    .select({
      familyId: schema.families.id,
      familyName: schema.families.name,
      status: schema.subscriptions.status,
      trialEndsAt: schema.subscriptions.trialEndsAt,
      nextBillingAt: schema.subscriptions.nextBillingAt,
      pastDueSince: schema.subscriptions.pastDueSince,
      blockedAt: schema.subscriptions.blockedAt,
    })
    .from(schema.subscriptions)
    .innerJoin(schema.families, eq(schema.subscriptions.familyId, schema.families.id))
    .orderBy(desc(schema.subscriptions.updatedAt));

  const summary = {
    total: all.length,
    active: all.filter((r) => r.status === "active").length,
    trialing: all.filter((r) => r.status === "trialing").length,
    pastDue: all.filter((r) => r.status === "past_due").length,
    blocked: all.filter((r) => r.status === "blocked").length,
  };

  const monthlyPrice = 29.9;
  const mrr = summary.active * monthlyPrice;
  const atRisk = summary.pastDue + summary.blocked;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Painel · Cobrança"
        title={
          <>
            Saúde <span className="display-serif italic">financeira</span>
          </>
        }
        description="Tudo veio de webhooks do Pagar.me (ou simulações locais enquanto o adapter está em modo sim)."
        tone="primary"
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          tone="primary"
          label="MRR"
          value={
            <span className="num tabular">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {mrr.toFixed(2).replace(".", ",")}
            </span>
          }
          icon={<Wallet className="h-4 w-4" />}
          trend="receita recorrente"
        />
        <StatCard
          tone="income"
          label="Ativas"
          value={<span className="num tabular">{summary.active}</span>}
          icon={<CheckCircle2 className="h-4 w-4 text-[var(--color-income)]" />}
          trend="pagando hoje"
        />
        <StatCard
          tone="warning"
          label="Em trial"
          value={<span className="num tabular">{summary.trialing}</span>}
          icon={<Clock className="h-4 w-4" />}
          trend="convertem em breve"
        />
        <StatCard
          tone={atRisk > 0 ? "expense" : "default"}
          label="Em atraso / bloqueadas"
          value={<span className="num tabular">{atRisk}</span>}
          icon={
            <AlertTriangle
              className={
                atRisk > 0
                  ? "h-4 w-4 text-[var(--color-expense)]"
                  : "h-4 w-4"
              }
            />
          }
          trend="past_due + blocked"
        />
      </div>

      <Section
        eyebrow="Atenção"
        title="Assinaturas em atraso"
        description="Past_due e blocked aparecem aqui pra você decidir se entra em contato ou deixa o D+10 fazer o trabalho."
      >
        <Card>
          <CardHeader>
            <CardTitle>Casos abertos</CardTitle>
            <CardDescription>
              Listadas por data de mudança de status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {all.filter((r) => r.status === "past_due" || r.status === "blocked").length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-fg-muted)]">
                Nenhuma. Tudo em dia.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                    <th className="py-2 font-medium">Família</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {all
                    .filter((r) => r.status === "past_due" || r.status === "blocked")
                    .map((r) => (
                      <tr key={r.familyId} className="border-b border-[var(--color-border)] last:border-b-0">
                        <td className="py-2 font-medium">{r.familyName}</td>
                        <td className="py-2">
                          <Badge variant={r.status === "blocked" ? "expense" : "warning"}>
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-2 num tabular text-xs text-[var(--color-fg-muted)]">
                          {r.pastDueSince
                            ? new Date(r.pastDueSince).toLocaleDateString("pt-BR")
                            : r.blockedAt
                              ? new Date(r.blockedAt).toLocaleDateString("pt-BR")
                              : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
