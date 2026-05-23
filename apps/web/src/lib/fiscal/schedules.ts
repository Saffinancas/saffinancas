"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { id as genId } from "@/lib/ids";
import { issueInvoiceForFamily, getDecryptedXml, getInvoiceById } from "./invoices";
import { sendInvoiceEmail } from "./email";
import { buildDanfeHtml } from "./danfe";

/**
 * Agendamentos recorrentes de NFSe.
 *
 * Cron: rodar `runDueSchedules()` num worker (cron diário no Vercel ou Fly).
 * Cada schedule tem `nextRunAt` calculado pro próximo dia X. Quando executar:
 *   1. Emite a nota
 *   2. Atualiza `lastRunAt`, calcula novo `nextRunAt`
 *   3. Incrementa contador
 *   4. Envia email com XML+DANFE pros `emailRecipients` (TODO: Resend integration)
 */

async function requireFamily(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const u = session.user as { familyId?: string | null };
  if (!u.familyId) throw new Error("Sem família.");
  return u.familyId;
}

function computeNextRun(dayOfMonth: number, from?: Date): Date {
  const base = from ?? new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const day = Math.min(28, Math.max(1, dayOfMonth));
  const thisMonth = new Date(year, month, day, 8, 0, 0); // emite às 8h
  if (thisMonth > base) return thisMonth;
  return new Date(year, month + 1, day, 8, 0, 0);
}

export type CreateScheduleInput = {
  recipientId: string;
  label: string;
  dayOfMonth: number;
  serviceValueCents: number;
  serviceDescription: string;
  serviceCode: string;
  issRateBps: number;
  issWithheld: boolean;
  emailRecipients: string[];
};

export async function createSchedule(input: CreateScheduleInput): Promise<{ id: string }> {
  if (input.dayOfMonth < 1 || input.dayOfMonth > 28) {
    throw new Error("Dia do mês precisa estar entre 1 e 28.");
  }
  if (input.serviceValueCents <= 0) throw new Error("Valor inválido.");
  if (!input.serviceDescription.trim()) throw new Error("Descrição obrigatória.");

  const familyId = await requireFamily();

  const [profile] = await db
    .select()
    .from(schema.fiscalProfiles)
    .where(eq(schema.fiscalProfiles.familyId, familyId))
    .limit(1);
  if (!profile) throw new Error("Cadastre o perfil fiscal antes de criar agendamento.");

  const scheduleId = genId("sch");
  await db.insert(schema.nfseSchedules).values({
    id: scheduleId,
    familyId,
    profileId: profile.id,
    recipientId: input.recipientId,
    label: input.label.trim(),
    dayOfMonth: input.dayOfMonth,
    serviceValueCents: input.serviceValueCents,
    serviceDescription: input.serviceDescription.trim(),
    serviceCode: input.serviceCode,
    issRateBps: input.issRateBps,
    issWithheld: input.issWithheld,
    status: "active",
    nextRunAt: computeNextRun(input.dayOfMonth),
    emailRecipients: input.emailRecipients.filter((e) => e.includes("@")),
  });

  revalidatePath("/app/fiscal/agendamentos");
  return { id: scheduleId };
}

export async function pauseSchedule(scheduleId: string): Promise<void> {
  const familyId = await requireFamily();
  await db
    .update(schema.nfseSchedules)
    .set({ status: "paused", nextRunAt: null, updatedAt: new Date() })
    .where(
      and(eq(schema.nfseSchedules.id, scheduleId), eq(schema.nfseSchedules.familyId, familyId)),
    );
  revalidatePath("/app/fiscal/agendamentos");
}

export async function resumeSchedule(scheduleId: string): Promise<void> {
  const familyId = await requireFamily();
  const [sch] = await db
    .select()
    .from(schema.nfseSchedules)
    .where(
      and(
        eq(schema.nfseSchedules.id, scheduleId),
        eq(schema.nfseSchedules.familyId, familyId),
      ),
    )
    .limit(1);
  if (!sch) return;
  await db
    .update(schema.nfseSchedules)
    .set({
      status: "active",
      nextRunAt: computeNextRun(sch.dayOfMonth),
      updatedAt: new Date(),
    })
    .where(eq(schema.nfseSchedules.id, scheduleId));
  revalidatePath("/app/fiscal/agendamentos");
}

export async function endSchedule(scheduleId: string): Promise<void> {
  const familyId = await requireFamily();
  await db
    .update(schema.nfseSchedules)
    .set({ status: "ended", nextRunAt: null, updatedAt: new Date() })
    .where(
      and(eq(schema.nfseSchedules.id, scheduleId), eq(schema.nfseSchedules.familyId, familyId)),
    );
  revalidatePath("/app/fiscal/agendamentos");
}

export async function listSchedules(familyId: string) {
  return db
    .select({
      id: schema.nfseSchedules.id,
      label: schema.nfseSchedules.label,
      dayOfMonth: schema.nfseSchedules.dayOfMonth,
      serviceValueCents: schema.nfseSchedules.serviceValueCents,
      serviceDescription: schema.nfseSchedules.serviceDescription,
      status: schema.nfseSchedules.status,
      nextRunAt: schema.nfseSchedules.nextRunAt,
      lastRunAt: schema.nfseSchedules.lastRunAt,
      invoicesIssued: schema.nfseSchedules.invoicesIssued,
      emailRecipients: schema.nfseSchedules.emailRecipients,
      recipientId: schema.nfseSchedules.recipientId,
      recipientName: schema.nfseRecipients.name,
    })
    .from(schema.nfseSchedules)
    .leftJoin(
      schema.nfseRecipients,
      eq(schema.nfseSchedules.recipientId, schema.nfseRecipients.id),
    )
    .where(eq(schema.nfseSchedules.familyId, familyId))
    .orderBy(desc(schema.nfseSchedules.createdAt));
}

/**
 * Executa agendamentos vencidos. Pra rodar via cron (Vercel cron job, Fly.io
 * scheduled machine, ou um worker dedicado).
 *
 * Idempotente: usa `nextRunAt <= now()` e atualiza após processar. Se falhar,
 * mantém `nextRunAt` e tenta de novo no próximo tick.
 */
export async function runDueSchedules(now: Date = new Date()): Promise<{
  processed: number;
  failed: number;
}> {
  const due = await db
    .select()
    .from(schema.nfseSchedules)
    .where(
      and(eq(schema.nfseSchedules.status, "active"), lte(schema.nfseSchedules.nextRunAt, now)),
    );

  let processed = 0;
  let failed = 0;

  for (const sch of due) {
    try {
      const result = await issueInvoiceForSchedule(sch);
      if (result.ok) {
        processed++;
        await db
          .update(schema.nfseSchedules)
          .set({
            lastRunAt: now,
            nextRunAt: computeNextRun(sch.dayOfMonth, new Date(now.getTime() + 24 * 60 * 60 * 1000)),
            invoicesIssued: sql`${schema.nfseSchedules.invoicesIssued} + 1`,
            updatedAt: now,
          })
          .where(eq(schema.nfseSchedules.id, sch.id));
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  return { processed, failed };
}

/**
 * Helper interno — emite uma nota a partir de um schedule. Sem cookie de sessão,
 * pra rodar via cron worker.
 *
 * 1. Chama o core `issueInvoiceForFamily` com os dados do schedule
 * 2. Marca o invoice com `scheduleId` pra rastreabilidade
 * 3. Dispara email pros recipients configurados (XML+DANFE)
 */
async function issueInvoiceForSchedule(
  sch: typeof schema.nfseSchedules.$inferSelect,
): Promise<{ ok: boolean; error?: string }> {
  const result = await issueInvoiceForFamily(sch.familyId, {
    recipientId: sch.recipientId,
    serviceCode: sch.serviceCode,
    serviceDescription: sch.serviceDescription,
    serviceValueCents: Number(sch.serviceValueCents),
    issRateBps: sch.issRateBps,
    issWithheld: sch.issWithheld,
    competenceDate: new Date().toISOString(),
    scheduleId: sch.id,
  });

  if (!result.ok) return { ok: false, error: result.error };

  // Marca scheduleId no invoice pra rastreabilidade.
  await db
    .update(schema.nfseInvoices)
    .set({ scheduleId: sch.id })
    .where(eq(schema.nfseInvoices.id, result.invoiceId));

  // Dispara email pros destinatários cadastrados (se houver).
  const recipients = (sch.emailRecipients as string[]) ?? [];
  if (recipients.length > 0) {
    const full = await getInvoiceById(result.invoiceId, sch.familyId);
    const xml = await getDecryptedXml(result.invoiceId, sch.familyId);
    const danfe =
      full?.invoice && full.profile
        ? buildDanfeHtml({
            invoice: full.invoice,
            profile: full.profile,
            recipient: full.recipient,
          })
        : "";
    try {
      await sendInvoiceEmail({
        to: recipients,
        subject: `NFSe ${full?.invoice.nfseNumber ?? full?.invoice.rpsNumber} · ${sch.label}`,
        invoiceNumber: full?.invoice.nfseNumber ?? null,
        xml: xml ?? "",
        danfeHtml: danfe,
      });
    } catch (e) {
      // Falha no email não invalida a emissão — só registra.
      await db.insert(schema.nfseEvents).values({
        id: genId("evt"),
        familyId: sch.familyId,
        invoiceId: result.invoiceId,
        scheduleId: sch.id,
        eventType: "email_failed",
        success: false,
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { ok: true };
}

/**
 * Dispara um schedule imediatamente (sem esperar o cron).
 * Útil pra teste manual e pra emitir "agora" o ciclo do mês.
 */
export async function runScheduleNow(
  scheduleId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const familyId = await requireFamily();

  const [sch] = await db
    .select()
    .from(schema.nfseSchedules)
    .where(
      and(
        eq(schema.nfseSchedules.id, scheduleId),
        eq(schema.nfseSchedules.familyId, familyId),
      ),
    )
    .limit(1);
  if (!sch) return { ok: false, error: "Agendamento não encontrado." };
  if (sch.status === "ended") {
    return { ok: false, error: "Agendamento encerrado." };
  }

  const result = await issueInvoiceForSchedule(sch);
  if (!result.ok) return { ok: false, error: result.error ?? "Falha na emissão." };

  const now = new Date();
  await db
    .update(schema.nfseSchedules)
    .set({
      lastRunAt: now,
      nextRunAt: computeNextRun(
        sch.dayOfMonth,
        new Date(now.getTime() + 24 * 60 * 60 * 1000),
      ),
      invoicesIssued: sql`${schema.nfseSchedules.invoicesIssued} + 1`,
      updatedAt: now,
    })
    .where(eq(schema.nfseSchedules.id, scheduleId));

  revalidatePath("/app/fiscal/agendamentos");
  revalidatePath("/app/fiscal");
  revalidatePath("/app/fiscal/notas");
  return { ok: true };
}
