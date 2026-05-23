import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db, schema } from "@cofre/db";
import { count, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function loadStats() {
  const [familiesCount] = await db.select({ n: count() }).from(schema.families);
  const [activeSubs] = await db
    .select({ n: count() })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.status, "active"));
  const [pastDueSubs] = await db
    .select({ n: count() })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.status, "past_due"));

  return {
    families: Number(familiesCount?.n ?? 0),
    active: Number(activeSubs?.n ?? 0),
    pastDue: Number(pastDueSubs?.n ?? 0),
  };
}

export default async function AdminDashboard() {
  const stats = await loadStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Saúde da plataforma em tempo real. Esses números são lidos direto do banco.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Famílias cadastradas" value={stats.families} />
        <Stat label="Assinaturas ativas" value={stats.active} accent="income" />
        <Stat
          label="Em atraso (past_due)"
          value={stats.pastDue}
          accent={stats.pastDue > 0 ? "expense" : undefined}
        />
        <Stat label="MRR estimado" value={`R$ ${(stats.active * 29.9).toFixed(2).replace(".", ",")}`} accent="primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximos passos</CardTitle>
          <CardDescription>
            O painel está vazio porque ainda não há clientes. À medida que famílias forem
            assinando, as listas abaixo se preenchem sozinhas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Row label="Cadastro de família" status="pending" desc="Falta a tela /assinar com checkout Pagar.me." />
          <Row label="Webhooks de cobrança" status="pending" desc="POST /api/webhooks/pagarme — idempotente." />
          <Row label="Worker WhatsApp" status="pending" desc="Pareamento via QR + ingestão na fila." />
          <Row label="Classificação por IA" status="done" desc="@cofre/ai já com Claude/OpenAI/Gemini stubados." />
          <Row label="Migrations aplicadas" status="done" desc="PGlite local, mesmo schema da nuvem." />
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
  const accentClass =
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
      <p className={`display-serif tabular mt-2 text-3xl ${accentClass}`}>{value}</p>
    </div>
  );
}

function Row({
  label,
  status,
  desc,
}: {
  label: string;
  status: "done" | "pending";
  desc: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] py-2 last:border-b-0">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-[var(--color-fg-muted)]">{desc}</p>
      </div>
      <Badge variant={status === "done" ? "income" : "warning"}>
        {status === "done" ? "feito" : "pendente"}
      </Badge>
    </div>
  );
}
