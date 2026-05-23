import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { id as genId } from "@/lib/ids";

/**
 * LGPD §18 — direito ao apagamento.
 *
 * Comportamento:
 *   1. Cria um registro em data_deletion_requests com scheduled_for = +30 dias.
 *   2. Loga em audit_logs.
 *   3. Não deleta nada imediatamente. Um cron diário (a implementar) processa
 *      requests cujo scheduled_for já passou e ainda não foram canceladas.
 *
 * O usuário pode cancelar a solicitação durante esses 30 dias via UI em
 * /app/config/excluir (criar na próxima entrega).
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const u = session.user as { familyId?: string | null };
  const now = new Date();
  const scheduledFor = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Idempotente: se já existe pedido aberto, retorna ele.
  const existing = await db
    .select()
    .from(schema.dataDeletionRequests)
    .where(eq(schema.dataDeletionRequests.userId, session.user.id))
    .limit(1);

  const open = existing.find((r) => !r.canceledAt && !r.completedAt);
  if (open) {
    return NextResponse.json({ ok: true, alreadyScheduled: true, scheduledFor: open.scheduledFor });
  }

  await db.insert(schema.dataDeletionRequests).values({
    id: genId("ddr"),
    userId: session.user.id,
    familyId: u.familyId ?? null,
    scheduledFor,
  });

  await db.insert(schema.auditLogs).values({
    id: genId("alog"),
    familyId: u.familyId ?? null,
    actorUserId: session.user.id,
    action: "data_deletion_requested",
    targetType: "user",
    targetId: session.user.id,
    metadata: { scheduledFor: scheduledFor.toISOString() },
  });

  return NextResponse.json({ ok: true, scheduledFor });
}
