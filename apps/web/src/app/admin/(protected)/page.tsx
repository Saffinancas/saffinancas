import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db, schema } from "@cofre/db";
import { count, eq } from "drizzle-orm";
import { Users, CheckCircle2, AlertTriangle, Wallet } from "lucide-react";
import { PageHeader, StatCard, Section } from "@/components/ui/page-header";

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
  const mrr = stats.active * 29.9;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Painel · Visão geral"
        title={
          <>
            Saúde da <span className="display-serif italic">plataforma</span>
          </>
        }
        description="Os números vêm direto do banco — sem cache nem aproximação."
        tone="primary"
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          tone="primary"
          label="Famílias cadastradas"
          value={<span className="num tabular">{stats.families}</span>}
          icon={<Users className="h-4 w-4" />}
          trend="total na base"
        />
        <StatCard
          tone="income"
          label="Assinaturas ativas"
          value={<span className="num tabular">{stats.active}</span>}
          icon={<CheckCircle2 className="h-4 w-4 text-[var(--color-income)]" />}
          trend="pagantes hoje"
        />
        <StatCard
          tone={stats.pastDue > 0 ? "expense" : "default"}
          label="Em atraso"
          value={<span className="num tabular">{stats.pastDue}</span>}
          icon={
            <AlertTriangle
              className={
                stats.pastDue > 0
                  ? "h-4 w-4 text-[var(--color-expense)]"
                  : "h-4 w-4"
              }
            />
          }
          trend="status past_due"
        />
        <StatCard
          tone="primary"
          label="MRR estimado"
          value={
            <span className="num tabular">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {mrr.toFixed(2).replace(".", ",")}
            </span>
          }
          icon={<Wallet className="h-4 w-4" />}
          trend="ativas × R$ 29,90"
        />
      </div>

      <Section
        eyebrow="Roadmap"
        title="Próximos passos"
        description="O painel está vazio porque ainda não há clientes. À medida que famílias forem assinando, as listas abaixo se preenchem sozinhas."
      >
        <Card>
          <CardHeader>
            <CardTitle>Checklist de plataforma</CardTitle>
            <CardDescription>
              Estado dos blocos críticos do produto.
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
      </Section>
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
