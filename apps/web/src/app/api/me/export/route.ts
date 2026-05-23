import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";

/**
 * LGPD §15 — direito de portabilidade. Devolve TODOS os dados que temos sobre
 * o user/família dele, em JSON. Cliente recebe download direto.
 *
 * Em produção, este endpoint deve gerar um link assinado com TTL curto e
 * enviar por email (caso o export demore — para famílias grandes pode passar
 * de muitos MB). Por ora, geração síncrona basta.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const u = session.user as { familyId?: string | null };
  const userId = session.user.id;

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);

  const familyId = u.familyId;
  const family = familyId
    ? (await db.select().from(schema.families).where(eq(schema.families.id, familyId)).limit(1))[0]
    : null;

  const transactions = familyId
    ? await db.select().from(schema.transactions).where(eq(schema.transactions.familyId, familyId))
    : [];

  const categories = familyId
    ? await db.select().from(schema.categories).where(eq(schema.categories.familyId, familyId))
    : [];

  const goals = familyId
    ? await db.select().from(schema.goals).where(eq(schema.goals.familyId, familyId))
    : [];

  const plannedExpenses = familyId
    ? await db
        .select()
        .from(schema.plannedExpenses)
        .where(eq(schema.plannedExpenses.familyId, familyId))
    : [];

  const futureIncomes = familyId
    ? await db
        .select()
        .from(schema.futureIncomes)
        .where(eq(schema.futureIncomes.familyId, familyId))
    : [];

  const subscription = familyId
    ? (
        await db
          .select()
          .from(schema.subscriptions)
          .where(eq(schema.subscriptions.familyId, familyId))
          .limit(1)
      )[0]
    : null;

  const whatsappSession = familyId
    ? (
        await db
          .select()
          .from(schema.whatsappSessions)
          .where(eq(schema.whatsappSessions.familyId, familyId))
          .limit(1)
      )[0]
    : null;

  const whatsappMembers = familyId
    ? await db
        .select()
        .from(schema.whatsappMembers)
        .where(eq(schema.whatsappMembers.familyId, familyId))
    : [];

  const auditLogs = familyId
    ? await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.familyId, familyId))
    : [];

  const dump = {
    exported_at: new Date().toISOString(),
    note: "Dados pessoais exportados sob LGPD §15. Mensagens brutas do WhatsApp são purgadas a cada 90 dias — não aparecem aqui se já passaram desse período.",
    user,
    family,
    subscription,
    whatsapp: { session: whatsappSession, members: whatsappMembers },
    transactions,
    categories,
    plannedExpenses,
    goals,
    futureIncomes,
    auditLogs,
  };

  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="saf-export-${userId}.json"`,
    },
  });
}
