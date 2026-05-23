"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, desc, eq, gte, lt, max, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/crypto";
import { id as genId } from "@/lib/ids";
import { getProviderAdapter } from "./providers";
import { getActiveCertificateDecrypted } from "./certificates";
import type { InvoiceRequest } from "./types";

async function requireFamily(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const u = session.user as { familyId?: string | null };
  if (!u.familyId) throw new Error("Sem família.");
  return u.familyId;
}

export type IssueInvoiceInput = {
  recipientId: string;
  serviceCode: string;
  cnae?: string | null;
  serviceDescription: string;
  serviceValueCents: number;
  issRateBps: number;
  issWithheld: boolean;
  competenceDate?: string;
  scheduleId?: string | null;
};

async function nextRpsNumber(familyId: string, serie: string): Promise<number> {
  const [row] = await db
    .select({ max: max(schema.nfseInvoices.rpsNumber) })
    .from(schema.nfseInvoices)
    .where(
      and(
        eq(schema.nfseInvoices.familyId, familyId),
        eq(schema.nfseInvoices.rpsSerie, serie),
      ),
    );
  return (Number(row?.max ?? 0) || 0) + 1;
}

/**
 * Emite uma NFSe.
 *  1. Carrega perfil + tomador
 *  2. Resolve adapter pelo `profile.preferredProvider`
 *  3. Chama `adapter.issue(req)` com o certificate ativo (se disponível)
 *  4. Persiste resultado em `nfse_invoices` + cria evento de auditoria
 *  5. Se sucesso, opcionalmente cria transação de receita
 */
export async function issueInvoice(
  input: IssueInvoiceInput,
): Promise<{ ok: true; invoiceId: string } | { ok: false; error: string }> {
  const familyId = await requireFamily();
  return issueInvoiceForFamily(familyId, input);
}

/**
 * Core de emissão — não usa requireFamily, recebe familyId direto.
 * Usado pelo worker de schedule (que roda sem cookie de sessão).
 */
export async function issueInvoiceForFamily(
  familyId: string,
  input: IssueInvoiceInput,
): Promise<{ ok: true; invoiceId: string } | { ok: false; error: string }> {
  if (input.serviceValueCents <= 0) {
    return { ok: false, error: "Valor inválido." };
  }
  if (!input.serviceDescription.trim()) {
    return { ok: false, error: "Descrição do serviço obrigatória." };
  }

  const [profile] = await db
    .select()
    .from(schema.fiscalProfiles)
    .where(eq(schema.fiscalProfiles.familyId, familyId))
    .limit(1);
  if (!profile) {
    return { ok: false, error: "Cadastre o perfil fiscal antes de emitir." };
  }

  const [recipient] = await db
    .select()
    .from(schema.nfseRecipients)
    .where(
      and(
        eq(schema.nfseRecipients.familyId, familyId),
        eq(schema.nfseRecipients.id, input.recipientId),
      ),
    )
    .limit(1);
  if (!recipient) {
    return { ok: false, error: "Tomador não encontrado." };
  }

  const competence = input.competenceDate ? new Date(input.competenceDate) : new Date();
  const rpsSerie = "A";
  const rpsNumber = await nextRpsNumber(familyId, rpsSerie);
  const invoiceId = genId("nfs");

  const issCents = Math.round((input.serviceValueCents * input.issRateBps) / 10000);

  // Inserir como draft pra ter o ID antes de chamar o provider.
  await db.insert(schema.nfseInvoices).values({
    id: invoiceId,
    familyId,
    profileId: profile.id,
    recipientId: recipient.id,
    rpsNumber,
    rpsSerie,
    provider: profile.preferredProvider,
    status: "processing",
    serviceValueCents: input.serviceValueCents,
    serviceDescription: input.serviceDescription.trim(),
    serviceCode: input.serviceCode,
    cnae: input.cnae ?? null,
    issRateBps: input.issRateBps,
    issValueCents: issCents,
    issWithheld: input.issWithheld,
    competenceDate: competence,
    scheduleId: input.scheduleId ?? null,
    attempts: 1,
  });

  const certificate = await getActiveCertificateDecrypted(familyId);
  const adapter = getProviderAdapter(profile.preferredProvider);

  const req: InvoiceRequest = {
    provider: {
      documentType: profile.documentType as "PF" | "PJ",
      documentNumber: profile.documentNumber,
      legalName: profile.legalName,
      municipalInscription: profile.municipalInscription,
      cityCode: profile.cityCode,
      address: profile.address as InvoiceRequest["provider"]["address"],
      regime: profile.regime,
    },
    recipient: {
      documentType: recipient.documentType as "PF" | "PJ",
      documentNumber: recipient.documentNumber,
      name: recipient.name,
      email: recipient.email,
      municipalInscription: recipient.municipalInscription,
      address: (recipient.address as InvoiceRequest["recipient"]["address"]) ?? null,
    },
    service: {
      code: input.serviceCode,
      cnae: input.cnae ?? null,
      description: input.serviceDescription.trim(),
      valueCents: input.serviceValueCents,
      issRateBps: input.issRateBps,
      issWithheld: input.issWithheld,
    },
    rps: { number: rpsNumber, serie: rpsSerie },
    competenceDate: competence.toISOString(),
    environment: profile.environment as "homologacao" | "producao",
    certificate: certificate ?? undefined,
  };

  const result = await adapter.issue(req);

  // Log evento
  await db.insert(schema.nfseEvents).values({
    id: genId("evt"),
    familyId,
    invoiceId,
    scheduleId: input.scheduleId ?? null,
    eventType: "issue",
    provider: profile.preferredProvider,
    payload: result.rawResponse ? { raw: JSON.stringify(result.rawResponse).slice(0, 5000) } : null,
    success: result.ok,
    errorMessage: result.error?.message ?? null,
  });

  if (result.ok) {
    await db
      .update(schema.nfseInvoices)
      .set({
        status: "issued",
        nfseNumber: result.nfseNumber ?? null,
        verificationCode: result.verificationCode ?? null,
        xmlEnc: result.xml ? encrypt(result.xml) : null,
        issuedAt: result.confirmedAt ? new Date(result.confirmedAt) : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.nfseInvoices.id, invoiceId));
  } else {
    await db
      .update(schema.nfseInvoices)
      .set({
        status: "rejected",
        errorMessage: result.error?.message ?? "Erro desconhecido",
        updatedAt: new Date(),
      })
      .where(eq(schema.nfseInvoices.id, invoiceId));
    revalidatePath("/app/fiscal");
    revalidatePath("/app/fiscal/notas");
    return { ok: false, error: result.error?.message ?? "Falha na emissão." };
  }

  revalidatePath("/app/fiscal");
  revalidatePath("/app/fiscal/notas");
  revalidatePath("/app");
  return { ok: true, invoiceId };
}

export async function cancelInvoice(
  invoiceId: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!reason.trim()) return { ok: false, error: "Informe o motivo." };
  const familyId = await requireFamily();

  const [invoice] = await db
    .select()
    .from(schema.nfseInvoices)
    .where(
      and(
        eq(schema.nfseInvoices.id, invoiceId),
        eq(schema.nfseInvoices.familyId, familyId),
      ),
    )
    .limit(1);
  if (!invoice) return { ok: false, error: "NFSe não encontrada." };
  if (invoice.status !== "issued") {
    return { ok: false, error: "Só notas emitidas podem ser canceladas." };
  }

  const [profile] = await db
    .select()
    .from(schema.fiscalProfiles)
    .where(eq(schema.fiscalProfiles.id, invoice.profileId))
    .limit(1);
  if (!profile) return { ok: false, error: "Perfil fiscal não encontrado." };

  const adapter = getProviderAdapter(invoice.provider);
  const result = await adapter.cancel({
    nfseNumber: Number(invoice.nfseNumber),
    verificationCode: invoice.verificationCode ?? undefined,
    reason,
    environment: profile.environment as "homologacao" | "producao",
  });

  await db.insert(schema.nfseEvents).values({
    id: genId("evt"),
    familyId,
    invoiceId,
    eventType: "cancel",
    provider: invoice.provider,
    success: result.ok,
    errorMessage: result.error ?? null,
  });

  if (!result.ok) return { ok: false, error: result.error ?? "Falha ao cancelar." };

  await db
    .update(schema.nfseInvoices)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      cancelReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(schema.nfseInvoices.id, invoiceId));

  revalidatePath("/app/fiscal");
  revalidatePath("/app/fiscal/notas");
  revalidatePath(`/app/fiscal/notas/${invoiceId}`);
  return { ok: true };
}

export async function listInvoices(
  familyId: string,
  opts?: { from?: Date; to?: Date; limit?: number },
) {
  let query = db
    .select({
      id: schema.nfseInvoices.id,
      nfseNumber: schema.nfseInvoices.nfseNumber,
      rpsNumber: schema.nfseInvoices.rpsNumber,
      rpsSerie: schema.nfseInvoices.rpsSerie,
      verificationCode: schema.nfseInvoices.verificationCode,
      provider: schema.nfseInvoices.provider,
      status: schema.nfseInvoices.status,
      serviceValueCents: schema.nfseInvoices.serviceValueCents,
      serviceDescription: schema.nfseInvoices.serviceDescription,
      serviceCode: schema.nfseInvoices.serviceCode,
      issValueCents: schema.nfseInvoices.issValueCents,
      issWithheld: schema.nfseInvoices.issWithheld,
      competenceDate: schema.nfseInvoices.competenceDate,
      issuedAt: schema.nfseInvoices.issuedAt,
      canceledAt: schema.nfseInvoices.canceledAt,
      errorMessage: schema.nfseInvoices.errorMessage,
      recipientName: schema.nfseRecipients.name,
      recipientDoc: schema.nfseRecipients.documentNumber,
    })
    .from(schema.nfseInvoices)
    .leftJoin(
      schema.nfseRecipients,
      eq(schema.nfseInvoices.recipientId, schema.nfseRecipients.id),
    )
    .$dynamic();

  const filters = [eq(schema.nfseInvoices.familyId, familyId)];
  if (opts?.from) filters.push(gte(schema.nfseInvoices.competenceDate, opts.from));
  if (opts?.to) filters.push(lt(schema.nfseInvoices.competenceDate, opts.to));

  query = query
    .where(and(...filters))
    .orderBy(desc(schema.nfseInvoices.competenceDate))
    .limit(opts?.limit ?? 500);

  return query;
}

export async function getInvoiceById(invoiceId: string, familyId: string) {
  const [row] = await db
    .select({
      invoice: schema.nfseInvoices,
      profile: schema.fiscalProfiles,
      recipient: schema.nfseRecipients,
    })
    .from(schema.nfseInvoices)
    .leftJoin(
      schema.fiscalProfiles,
      eq(schema.nfseInvoices.profileId, schema.fiscalProfiles.id),
    )
    .leftJoin(
      schema.nfseRecipients,
      eq(schema.nfseInvoices.recipientId, schema.nfseRecipients.id),
    )
    .where(
      and(
        eq(schema.nfseInvoices.id, invoiceId),
        eq(schema.nfseInvoices.familyId, familyId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getDecryptedXml(invoiceId: string, familyId: string): Promise<string | null> {
  const [row] = await db
    .select({ xmlEnc: schema.nfseInvoices.xmlEnc })
    .from(schema.nfseInvoices)
    .where(
      and(
        eq(schema.nfseInvoices.id, invoiceId),
        eq(schema.nfseInvoices.familyId, familyId),
      ),
    )
    .limit(1);
  if (!row?.xmlEnc) return null;
  try {
    return decrypt(row.xmlEnc);
  } catch {
    return null;
  }
}

/**
 * Marca uma nota emitida como recebida — cria uma transaction de receita
 * vinculada e atualiza os campos de pagamento.
 *
 * Idempotente: se já marcada, retorna ok sem duplicar.
 */
export async function markInvoicePaid(
  invoiceId: string,
  opts?: { paidAt?: string; paidAmountCents?: number },
): Promise<{ ok: true; transactionId: string } | { ok: false; error: string }> {
  const familyId = await requireFamily();

  const [invoice] = await db
    .select()
    .from(schema.nfseInvoices)
    .where(
      and(eq(schema.nfseInvoices.id, invoiceId), eq(schema.nfseInvoices.familyId, familyId)),
    )
    .limit(1);
  if (!invoice) return { ok: false, error: "Nota não encontrada." };
  if (invoice.status !== "issued") {
    return { ok: false, error: "Só notas emitidas podem ser marcadas como recebidas." };
  }
  if (invoice.linkedTransactionId) {
    return { ok: true, transactionId: invoice.linkedTransactionId };
  }

  const paidAt = opts?.paidAt ? new Date(opts.paidAt) : new Date();
  const valueCents = opts?.paidAmountCents ?? Number(invoice.serviceValueCents);

  const recipient = invoice.recipientId
    ? (
        await db
          .select()
          .from(schema.nfseRecipients)
          .where(eq(schema.nfseRecipients.id, invoice.recipientId))
          .limit(1)
      )[0]
    : null;

  const incomeCats = await db
    .select()
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.familyId, familyId),
        sql`${schema.categories.allowedType} in ('income', 'both')`,
        sql`${schema.categories.archivedAt} is null`,
      ),
    );
  const categoryId =
    incomeCats.find((c) => /renda extra/i.test(c.name))?.id ??
    incomeCats.find((c) => /sal[aá]rio/i.test(c.name))?.id ??
    incomeCats[0]?.id ??
    null;

  const txId = genId("tx");
  await db.insert(schema.transactions).values({
    id: txId,
    familyId,
    type: "income",
    amountCents: valueCents,
    description: `NFSe ${invoice.nfseNumber ?? `RPS ${invoice.rpsNumber}`}${
      recipient ? " · " + recipient.name : ""
    }`,
    occurredAt: paidAt,
    categoryId,
    origin: "manual",
    status: "confirmed",
  });

  await db
    .update(schema.nfseInvoices)
    .set({
      paymentReceivedAt: paidAt,
      paymentReceivedAmountCents: valueCents,
      linkedTransactionId: txId,
      updatedAt: new Date(),
    })
    .where(eq(schema.nfseInvoices.id, invoiceId));

  await db.insert(schema.nfseEvents).values({
    id: genId("evt"),
    familyId,
    invoiceId,
    eventType: "payment_received",
    success: true,
  });

  revalidatePath("/app/fiscal");
  revalidatePath("/app/fiscal/notas");
  revalidatePath(`/app/fiscal/notas/${invoiceId}`);
  revalidatePath("/app");
  revalidatePath("/app/transacoes");
  return { ok: true, transactionId: txId };
}

/** Desfaz a marcação de pagamento: apaga a transaction e limpa os campos. */
export async function unmarkInvoicePaid(invoiceId: string): Promise<void> {
  const familyId = await requireFamily();
  const [invoice] = await db
    .select()
    .from(schema.nfseInvoices)
    .where(
      and(eq(schema.nfseInvoices.id, invoiceId), eq(schema.nfseInvoices.familyId, familyId)),
    )
    .limit(1);
  if (!invoice || !invoice.linkedTransactionId) return;

  await db
    .update(schema.transactions)
    .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.transactions.id, invoice.linkedTransactionId),
        eq(schema.transactions.familyId, familyId),
      ),
    );

  await db
    .update(schema.nfseInvoices)
    .set({
      paymentReceivedAt: null,
      paymentReceivedAmountCents: null,
      linkedTransactionId: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.nfseInvoices.id, invoiceId));

  await db.insert(schema.nfseEvents).values({
    id: genId("evt"),
    familyId,
    invoiceId,
    eventType: "payment_unmarked",
    success: true,
  });

  revalidatePath("/app/fiscal");
  revalidatePath(`/app/fiscal/notas/${invoiceId}`);
  revalidatePath("/app");
  revalidatePath("/app/transacoes");
}

/** Lista contas a receber — notas emitidas, não canceladas, sem pagamento confirmado. */
export async function listReceivables(familyId: string) {
  return db
    .select({
      id: schema.nfseInvoices.id,
      nfseNumber: schema.nfseInvoices.nfseNumber,
      rpsNumber: schema.nfseInvoices.rpsNumber,
      rpsSerie: schema.nfseInvoices.rpsSerie,
      serviceValueCents: schema.nfseInvoices.serviceValueCents,
      serviceDescription: schema.nfseInvoices.serviceDescription,
      competenceDate: schema.nfseInvoices.competenceDate,
      issuedAt: schema.nfseInvoices.issuedAt,
      recipientName: schema.nfseRecipients.name,
      scheduleId: schema.nfseInvoices.scheduleId,
    })
    .from(schema.nfseInvoices)
    .leftJoin(
      schema.nfseRecipients,
      eq(schema.nfseInvoices.recipientId, schema.nfseRecipients.id),
    )
    .where(
      and(
        eq(schema.nfseInvoices.familyId, familyId),
        eq(schema.nfseInvoices.status, "issued"),
        sql`${schema.nfseInvoices.paymentReceivedAt} is null`,
      ),
    )
    .orderBy(desc(schema.nfseInvoices.competenceDate));
}

export async function summaryForFamily(familyId: string, opts?: { yearMonth?: string }) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfMonth = opts?.yearMonth
    ? new Date(opts.yearMonth + "-01")
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const startNextMonth = new Date(
    startOfMonth.getFullYear(),
    startOfMonth.getMonth() + 1,
    1,
  );

  const [month] = await db
    .select({
      count: sql<number>`count(*)`.as("count"),
      total: sql<number>`coalesce(sum(${schema.nfseInvoices.serviceValueCents}), 0)`.as("total"),
      iss: sql<number>`coalesce(sum(${schema.nfseInvoices.issValueCents}), 0)`.as("iss"),
    })
    .from(schema.nfseInvoices)
    .where(
      and(
        eq(schema.nfseInvoices.familyId, familyId),
        eq(schema.nfseInvoices.status, "issued"),
        gte(schema.nfseInvoices.competenceDate, startOfMonth),
        lt(schema.nfseInvoices.competenceDate, startNextMonth),
      ),
    );

  const [year] = await db
    .select({
      count: sql<number>`count(*)`.as("count"),
      total: sql<number>`coalesce(sum(${schema.nfseInvoices.serviceValueCents}), 0)`.as("total"),
    })
    .from(schema.nfseInvoices)
    .where(
      and(
        eq(schema.nfseInvoices.familyId, familyId),
        eq(schema.nfseInvoices.status, "issued"),
        gte(schema.nfseInvoices.competenceDate, startOfYear),
      ),
    );

  return {
    month: {
      count: Number(month?.count ?? 0),
      total: Number(month?.total ?? 0),
      iss: Number(month?.iss ?? 0),
    },
    year: {
      count: Number(year?.count ?? 0),
      total: Number(year?.total ?? 0),
    },
  };
}
