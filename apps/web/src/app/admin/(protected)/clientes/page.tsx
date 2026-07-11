import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";

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
    <div className="space-y-8">
      <PageHeader
        eyebrow="Painel · Clientes"
        title={
          <>
            Famílias <span className="display-serif italic">na base</span>
          </>
        }
        description={`${rows.length} famílias cadastradas. Clique numa linha pra ver detalhe, mudar plano ou trocar IA.`}
        tone="primary"
      />

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
        <>
          {/* Desktop / tablet — tabela */}
          <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="sticky top-14 z-10 bg-[var(--color-surface)]/95 backdrop-blur">
                  <tr className="border-b border-[var(--color-border)] text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
                    <th className="px-4 py-3">Família</th>
                    <th className="px-4 py-3">Titular</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Próx. cobrança</th>
                    <th className="px-4 py-3">Criada em</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.familyId}
                      className="group cursor-pointer border-b border-[var(--color-border)] transition-colors duration-150 last:border-b-0 hover:bg-[var(--color-primary-soft)]/30"
                    >
                      <td className="px-4 py-2.5 font-medium">
                        <Link
                          href={`/admin/clientes/${r.familyId}`}
                          className="block"
                        >
                          {r.familyName}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--color-fg-muted)]">
                        <Link
                          href={`/admin/clientes/${r.familyId}`}
                          className="block"
                        >
                          {r.ownerName ?? "—"}
                          <br />
                          <span className="text-[var(--color-fg-subtle)]">
                            {r.ownerEmail ?? ""}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/clientes/${r.familyId}`}
                          className="block"
                        >
                          <StatusBadge status={r.subStatus} />
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 num tabular text-xs">
                        <Link
                          href={`/admin/clientes/${r.familyId}`}
                          className="block"
                        >
                          {r.nextBillingAt
                            ? new Date(r.nextBillingAt).toLocaleDateString("pt-BR")
                            : r.trialEndsAt
                              ? `trial até ${new Date(r.trialEndsAt).toLocaleDateString("pt-BR")}`
                              : "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 num tabular text-xs text-[var(--color-fg-muted)]">
                        <Link
                          href={`/admin/clientes/${r.familyId}`}
                          className="block"
                        >
                          {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile — cards */}
          <ul className="space-y-2.5 md:hidden">
            {rows.map((r) => (
              <li key={r.familyId}>
                <Link
                  href={`/admin/clientes/${r.familyId}`}
                  className="card-hover block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">
                        {r.familyName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--color-fg-muted)]">
                        {r.ownerName ?? "—"}
                      </p>
                      <p className="truncate text-[11px] text-[var(--color-fg-subtle)]">
                        {r.ownerEmail ?? ""}
                      </p>
                    </div>
                    <StatusBadge status={r.subStatus} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--color-border)] pt-3 text-[11px] text-[var(--color-fg-subtle)]">
                    <span>
                      <span className="uppercase tracking-[0.1em]">Cobrança:</span>{" "}
                      <span className="num text-[var(--color-fg-muted)]">
                        {r.nextBillingAt
                          ? new Date(r.nextBillingAt).toLocaleDateString("pt-BR")
                          : r.trialEndsAt
                            ? `trial ${new Date(r.trialEndsAt).toLocaleDateString("pt-BR")}`
                            : "—"}
                      </span>
                    </span>
                    <span>
                      <span className="uppercase tracking-[0.1em]">Criada:</span>{" "}
                      <span className="num text-[var(--color-fg-muted)]">
                        {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
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
