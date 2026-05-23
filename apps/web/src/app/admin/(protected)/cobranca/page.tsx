import { desc, eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cobrança</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Saúde financeira da plataforma. Tudo veio de webhooks do Pagar.me (ou simulações
          locais enquanto o adapter está em modo sim).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR" value={`R$ ${mrr.toFixed(2).replace(".", ",")}`} accent="primary" />
        <Stat label="Ativas" value={summary.active} accent="income" />
        <Stat label="Em trial" value={summary.trialing} />
        <Stat label="Em atraso / bloqueadas" value={summary.pastDue + summary.blocked} accent={summary.pastDue + summary.blocked > 0 ? "expense" : undefined} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assinaturas em atraso</CardTitle>
          <CardDescription>
            Past_due e blocked aparecem aqui pra você decidir se entra em contato ou deixa
            o D+10 fazer o trabalho.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {all.filter((r) => r.status === "past_due" || r.status === "blocked").length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-fg-muted)]">
              Nenhuma. 🎉
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
                      <td className="py-2">{r.familyName}</td>
                      <td className="py-2">
                        <Badge variant={r.status === "blocked" ? "expense" : "warning"}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-[var(--color-fg-muted)]">
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
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "income" | "expense" | "primary";
}) {
  const ac =
    accent === "income"
      ? "text-[var(--color-income)]"
      : accent === "expense"
        ? "text-[var(--color-expense)]"
        : accent === "primary"
          ? "text-[var(--color-primary)]"
          : "text-[var(--color-fg)]";
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">{label}</p>
      <p className={"display-serif tabular mt-2 text-3xl " + ac}>{value}</p>
    </div>
  );
}
