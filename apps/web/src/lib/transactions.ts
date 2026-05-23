"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, desc, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { id } from "@/lib/ids";

async function requireFamily(): Promise<{ familyId: string; userId: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const u = session.user as { familyId?: string | null };
  if (!u.familyId) throw new Error("Sem família associada.");
  return { familyId: u.familyId, userId: session.user.id };
}

export type NewTransactionInput = {
  type: "expense" | "income";
  amountCents: number;
  description: string;
  occurredAt: string; // ISO date (YYYY-MM-DD or full)
  categoryId?: string | null;
};

export async function createManualTransaction(input: NewTransactionInput) {
  if (input.amountCents <= 0) throw new Error("Valor inválido.");
  if (input.description.trim().length < 1) throw new Error("Descrição vazia.");

  const { familyId, userId } = await requireFamily();
  const now = new Date();
  const occurred = new Date(input.occurredAt);
  if (Number.isNaN(occurred.getTime())) throw new Error("Data inválida.");

  await db.insert(schema.transactions).values({
    id: id("tx"),
    familyId,
    type: input.type,
    amountCents: Math.round(input.amountCents),
    description: input.description.trim(),
    occurredAt: occurred,
    categoryId: input.categoryId || null,
    origin: "manual",
    status: "confirmed",
    createdByUserId: userId,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath("/app");
  revalidatePath("/app/transacoes");
}

export async function updateTransaction(
  transactionId: string,
  patch: Partial<NewTransactionInput>,
) {
  const { familyId } = await requireFamily();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.amountCents !== undefined) {
    if (patch.amountCents <= 0) throw new Error("Valor inválido.");
    updates.amountCents = Math.round(patch.amountCents);
  }
  if (patch.description !== undefined) updates.description = patch.description.trim();
  if (patch.type !== undefined) updates.type = patch.type;
  if (patch.occurredAt !== undefined) {
    const d = new Date(patch.occurredAt);
    if (Number.isNaN(d.getTime())) throw new Error("Data inválida.");
    updates.occurredAt = d;
  }
  if (patch.categoryId !== undefined) updates.categoryId = patch.categoryId || null;

  await db
    .update(schema.transactions)
    .set(updates)
    .where(
      and(eq(schema.transactions.id, transactionId), eq(schema.transactions.familyId, familyId)),
    );
  revalidatePath("/app");
  revalidatePath("/app/transacoes");
}

export async function deleteTransaction(transactionId: string) {
  const { familyId } = await requireFamily();
  await db
    .update(schema.transactions)
    .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(schema.transactions.id, transactionId), eq(schema.transactions.familyId, familyId)),
    );
  revalidatePath("/app");
  revalidatePath("/app/transacoes");
}

export async function bulkRecategorize(transactionIds: string[], categoryId: string | null) {
  if (transactionIds.length === 0) return;
  const { familyId } = await requireFamily();
  await db
    .update(schema.transactions)
    .set({ categoryId, updatedAt: new Date() })
    .where(
      and(
        eq(schema.transactions.familyId, familyId),
        sql`${schema.transactions.id} in (${sql.join(
          transactionIds.map((i) => sql`${i}`),
          sql`, `,
        )})`,
      ),
    );
  revalidatePath("/app");
  revalidatePath("/app/transacoes");
}

export async function listTransactionsForFamily(
  familyId: string,
  opts?: { limit?: number },
) {
  return db
    .select({
      id: schema.transactions.id,
      type: schema.transactions.type,
      amountCents: schema.transactions.amountCents,
      description: schema.transactions.description,
      occurredAt: schema.transactions.occurredAt,
      origin: schema.transactions.origin,
      status: schema.transactions.status,
      categoryId: schema.transactions.categoryId,
      categoryName: schema.categories.name,
    })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(
      and(
        eq(schema.transactions.familyId, familyId),
        sql`${schema.transactions.status} != 'deleted'`,
      ),
    )
    .orderBy(desc(schema.transactions.occurredAt))
    .limit(opts?.limit ?? 200);
}

export async function listCategoriesForFamily(familyId: string) {
  return db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      allowedType: schema.categories.allowedType,
      icon: schema.categories.icon,
    })
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.familyId, familyId),
        sql`${schema.categories.archivedAt} is null`,
      ),
    )
    .orderBy(schema.categories.sortOrder, schema.categories.name);
}
