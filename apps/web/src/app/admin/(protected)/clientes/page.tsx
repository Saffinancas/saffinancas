import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const rows = await db
    .select({
      familyId: schema.families.id,
      familyName: schema.families.name,
      createdAt: schema.families.createdAt,
      subStatus: schema.subscriptions.status,
      trialEndsAt: schema.subscriptions.trialEndsAt,
      nextBillingAt: schema.subscriptions.nextBillingAt,
      ownerEmail: schema.users.email,
      ownerName: schema.users.name,
    })
    .from(schema.families)
    .leftJoin(schema.subscriptions, eq(schema.subscriptions.familyId, schema.families.id))
    .leftJoin(schema.users, eq(schema.users.familyId, schema.families.id))
    .orderBy(desc(schema.families.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          {rows.length} famílias cadastradas. Clique numa linha pra ver detalhe, mudar plano
          ou trocar IA.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma família ainda</CardTitle>
            <CardDescription>
              Quando alguém criar uma conta em /assinar, aparece aqui.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                <th className="px-4 py-2.5 font-medium">Família</th>
                <th className="px-4 py-2.5 font-medium">Titular</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Próx. cobrança</th>
                <th className="px-4 py-2.5 font-medium">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.familyId}
                  className="cursor-pointer border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-muted)]"
                >
                  <td className="px-4 py-2.5 font-medium">
                    <Link href={`/admin/clientes/${r.familyId}`} className="block">
                      {r.familyName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-fg-muted)]">
                    <Link href={`/admin/clientes/${r.familyId}`} className="block">
                      {r.ownerName ?? "—"}
                      <br />
                      <span className="text-[var(--color-fg-subtle)]">{r.ownerEmail ?? ""}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/clientes/${r.familyId}`} className="block">
                      <StatusBadge status={r.subStatus} />
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <Link href={`/admin/clientes/${r.familyId}`} className="block">
                      {r.nextBillingAt
                        ? new Date(r.nextBillingAt).toLocaleDateString("pt-BR")
                        : r.trialEndsAt
                          ? `trial até ${new Date(r.trialEndsAt).toLocaleDateString("pt-BR")}`
                          : "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-fg-muted)]">
                    <Link href={`/admin/clientes/${r.familyId}`} className="block">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge variant="default">—</Badge>;
  const map: Record<string, "income" | "primary" | "warning" | "expense" | "default"> = {
    active: "income",
    trialing: "primary",
    past_due: "warning",
    canceled: "default",
    blocked: "expense",
  };
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
}
