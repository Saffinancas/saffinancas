import { desc, eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminAuditoriaPage() {
  const events = await db
    .select({
      id: schema.auditLogs.id,
      action: schema.auditLogs.action,
      familyId: schema.auditLogs.familyId,
      targetType: schema.auditLogs.targetType,
      targetId: schema.auditLogs.targetId,
      ipAddress: schema.auditLogs.ipAddress,
      createdAt: schema.auditLogs.createdAt,
      actorEmail: schema.users.email,
      familyName: schema.families.name,
    })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.auditLogs.actorUserId, schema.users.id))
    .leftJoin(schema.families, eq(schema.auditLogs.familyId, schema.families.id))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Últimos 200 eventos. IPs ficam anonimizados após 90 dias.
        </p>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum evento ainda</CardTitle>
            <CardDescription>
              Ações sensíveis (login, mudança de IA, despareiamento WhatsApp, exclusão de
              dados) aparecem aqui conforme acontecem.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                <th className="px-4 py-2.5 font-medium">Quando</th>
                <th className="px-4 py-2.5 font-medium">Ação</th>
                <th className="px-4 py-2.5 font-medium">Família</th>
                <th className="px-4 py-2.5 font-medium">Ator</th>
                <th className="px-4 py-2.5 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-[var(--color-fg-muted)]">
                    {new Date(e.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-2 font-medium">{e.action}</td>
                  <td className="px-4 py-2 text-xs text-[var(--color-fg-muted)]">
                    {e.familyName ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--color-fg-muted)]">
                    {e.actorEmail ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-[var(--color-fg-subtle)]">
                    {e.ipAddress ?? "—"}
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
