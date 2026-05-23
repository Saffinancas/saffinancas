import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const cats = await db
    .select()
    .from(schema.categories)
    .where(and(eq(schema.categories.familyId, familyId)))
    .orderBy(schema.categories.sortOrder, schema.categories.name);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          {cats.length} categoria{cats.length === 1 ? "" : "s"} configuradas. Criar/editar
          virá num próximo update — por ora as padrão cobrem o essencial.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorias da família</CardTitle>
          <CardDescription>
            Cada nova família começa com as padrão. Você pode reclassificar transações
            entre elas direto na lista de Transações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {cats.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-[10px] text-[var(--color-fg-subtle)]">
                    {c.allowedType === "both"
                      ? "Despesa + Receita"
                      : c.allowedType === "income"
                        ? "Receita"
                        : "Despesa"}
                  </p>
                </div>
                {c.isSystem && <Badge variant="default">padrão</Badge>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
