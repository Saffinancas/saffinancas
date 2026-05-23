import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, eq, gte, sum } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { describeSubscription } from "@/lib/subscription";
import { avgCostPerCallCents } from "@/lib/ai-pricing";
import { formatBRL } from "@/lib/utils";
import { FamilyDetailActions } from "./detail-actions";

export const dynamic = "force-dynamic";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function FamilyDetailPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;

  const [family] = await db
    .select()
    .from(schema.families)
    .where(eq(schema.families.id, familyId))
    .limit(1);
  if (!family) notFound();

  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.familyId, familyId))
    .limit(1);

  const members = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      lastLoginAt: schema.users.lastLoginAt,
    })
    .from(schema.users)
    .where(eq(schema.users.familyId, familyId));

  const monthStart = startOfMonth(new Date());

  const [txCount] = await db
    .select({ n: count() })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.familyId, familyId),
        gte(schema.transactions.occurredAt, monthStart),
      ),
    );

  const [aiUsage] = await db
    .select({
      calls: count(),
      cost: sum(schema.aiUsageEvents.costCents).as("cost"),
    })
    .from(schema.aiUsageEvents)
    .where(
      and(
        eq(schema.aiUsageEvents.familyId, familyId),
        gte(schema.aiUsageEvents.createdAt, monthStart),
      ),
    );

  const state = describeSubscription(sub);
  const aiCallsThisMonth = Number(aiUsage?.calls ?? 0);
  const aiCostCents = Number(aiUsage?.cost ?? 0);
  // Se ainda não houver eventos reais (modo sim), projetamos pelo nº de
  // transações classificadas + custo médio do provedor escolhido.
  const projectedCostCents =
    aiCallsThisMonth > 0
      ? aiCostCents
      : Number(txCount?.n ?? 0) * avgCostPerCallCents(
          (family.aiProvider === "auto" ? "claude" : family.aiProvider) as "claude" | "openai" | "gemini",
        );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/admin/clientes"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <StatusBadge status={sub?.status ?? null} />
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{family.name}</h1>
        <p className="mt-1 text-xs text-[var(--color-fg-subtle)]">
          ID: <code>{family.id}</code> · criada em{" "}
          {new Date(family.createdAt).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <FamilyDetailActions
        familyId={family.id}
        currentStatus={sub?.status ?? "trialing"}
        currentProvider={family.aiProvider}
        byokEnabled={family.byokEnabled}
        byokProvider={family.byokProvider}
        byokKeyPresent={!!family.byokApiKeyEnc}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Transações neste mês" value={Number(txCount?.n ?? 0)} />
        <Stat
          label="Chamadas de IA neste mês"
          value={aiCallsThisMonth}
          hint={aiCallsThisMonth === 0 ? "Estimado a partir das transações" : "Real"}
        />
        <Stat
          label="Custo IA estimado (mês)"
          value={formatBRL(projectedCostCents)}
          tone="primary"
          hint={`@ ${family.aiProvider}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membros</CardTitle>
          <CardDescription>
            Usuários vinculados a esta família. Por enquanto cada família tem 1 titular.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-muted)]">Nenhum membro ainda.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{m.name ?? m.email}</p>
                    <p className="text-xs text-[var(--color-fg-subtle)]">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-fg-muted)]">
                    <Badge variant={m.role === "customer" ? "default" : "primary"}>{m.role}</Badge>
                    {m.lastLoginAt && (
                      <span>
                        último login: {new Date(m.lastLoginAt).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assinatura</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Status" value={sub?.status ?? "—"} />
            <Field label="Plano" value={sub?.plan ?? "—"} />
            <Field
              label="Trial até"
              value={sub?.trialEndsAt ? new Date(sub.trialEndsAt).toLocaleDateString("pt-BR") : "—"}
            />
            <Field
              label="Próxima cobrança"
              value={
                sub?.nextBillingAt ? new Date(sub.nextBillingAt).toLocaleDateString("pt-BR") : "—"
              }
            />
            <Field
              label="Past due desde"
              value={
                sub?.pastDueSince ? new Date(sub.pastDueSince).toLocaleDateString("pt-BR") : "—"
              }
            />
            <Field label="Pagar.me sub ID" value={sub?.pagarmeSubscriptionId ?? "—"} />
          </dl>
          {state.kind === "free" && (
            <p className="mt-4 text-xs text-[var(--color-income)]">
              <strong>Plano gratuito ativo.</strong> Família tem acesso ilimitado, sem cobrança.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string | number;
  tone?: "income" | "expense" | "primary";
  hint?: string;
}) {
  const ac =
    tone === "income"
      ? "text-[var(--color-income)]"
      : tone === "expense"
        ? "text-[var(--color-expense)]"
        : tone === "primary"
          ? "text-[var(--color-primary)]"
          : "text-[var(--color-fg)]";
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">{label}</p>
      <p className={"display-serif tabular mt-2 text-2xl " + ac}>{value}</p>
      {hint && <p className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">{hint}</p>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="default">sem assinatura</Badge>;
  const map: Record<string, "income" | "primary" | "warning" | "expense" | "default"> = {
    active: "income",
    free: "income",
    trialing: "primary",
    past_due: "warning",
    blocked: "expense",
    canceled: "default",
  };
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
}
