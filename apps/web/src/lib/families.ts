"use server";

import { db, schema } from "@cofre/db";
import { DEFAULT_CATEGORIES } from "@cofre/db/seed-categories";
import { and, eq, isNull } from "drizzle-orm";
import { id } from "@/lib/ids";
import { BRAND } from "@/lib/brand";

type BootstrapResult =
  | { ok: true; familyId: string }
  | { ok: false; reason: "user_not_found" | "already_bootstrapped" };

/**
 * Após signUpEmail bem-sucedido, este helper:
 *  - cria a Family
 *  - vincula users.familyId
 *  - cria a Subscription em status='trialing' por 7 dias
 *  - semeia categorias padrão
 *
 * Idempotente: se o user já tem familyId, retorna 'already_bootstrapped'.
 *
 * SEGURANÇA (TOCTOU): sem gate atômico, duas requisições concorrentes
 * (double-click, retry de rede) leem `familyId=null` ANTES do UPDATE
 * commitar e ambas prosseguem — resultado: duas families órfãs, duas
 * subscriptions trial ativas e uma delas sem usuário vinculado.
 *
 * Fix: usar o UPDATE `SET familyId=? WHERE id=? AND familyId IS NULL`
 * como GATE atômico. Se rowCount = 0, alguém já ganhou a corrida;
 * limpamos a family recém-criada e retornamos idempotentemente.
 */
export async function bootstrapFamilyForUser(opts: {
  userId: string;
  familyName: string;
}): Promise<BootstrapResult> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, opts.userId))
    .limit(1);

  if (!user) return { ok: false, reason: "user_not_found" };
  if (user.familyId) return { ok: false, reason: "already_bootstrapped" };

  const familyId = id("fam");
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + BRAND.pricing.trialDays * 24 * 60 * 60 * 1000);

  await db.insert(schema.families).values({
    id: familyId,
    name: opts.familyName,
    aiProvider: "claude",
    timezone: "America/Sao_Paulo",
    notifyOnCapture: false,
  });

  // Gate atômico: só o vencedor da corrida consegue vincular. `returning`
  // devolve as linhas alteradas — se vazio, houve concorrência.
  const won = await db
    .update(schema.users)
    .set({
      familyId,
      role: "customer",
      updatedAt: now,
    })
    .where(
      and(eq(schema.users.id, opts.userId), isNull(schema.users.familyId)),
    )
    .returning({ id: schema.users.id });

  if (won.length === 0) {
    // Perdeu a corrida — outra requisição já bootstrappou. Limpa a family
    // órfã que acabamos de criar e retorna idempotentemente.
    await db.delete(schema.families).where(eq(schema.families.id, familyId));
    return { ok: false, reason: "already_bootstrapped" };
  }

  await db.insert(schema.subscriptions).values({
    id: id("sub"),
    familyId,
    status: "trialing",
    plan: "family-monthly",
    trialEndsAt,
  });

  // Categorias padrão
  await db.insert(schema.categories).values(
    DEFAULT_CATEGORIES.map((c, i) => ({
      id: id("cat"),
      familyId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      allowedType: c.allowedType,
      isSystem: true,
      sortOrder: i,
    })),
  );

  return { ok: true, familyId };
}
