"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { id as genId } from "@/lib/ids";

async function requireFamily(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const u = session.user as { familyId?: string | null };
  if (!u.familyId) throw new Error("Sem família.");
  return u.familyId;
}

export type RecipientInput = {
  documentType: "PF" | "PJ";
  documentNumber: string;
  name: string;
  email?: string | null;
  municipalInscription?: string | null;
  address?: {
    street: string;
    number: string;
    complement?: string | null;
    district: string;
    cityCode: string;
    cityName: string;
    stateCode: string;
    zipCode: string;
  } | null;
  notes?: string | null;
};

export async function upsertRecipient(input: RecipientInput): Promise<{ id: string }> {
  if (!input.documentNumber || !input.name) {
    throw new Error("Informe documento e nome.");
  }
  const familyId = await requireFamily();
  const doc = input.documentNumber.replace(/\D/g, "");

  const [existing] = await db
    .select()
    .from(schema.nfseRecipients)
    .where(
      and(
        eq(schema.nfseRecipients.familyId, familyId),
        eq(schema.nfseRecipients.documentNumber, doc),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(schema.nfseRecipients)
      .set({
        name: input.name.trim(),
        email: input.email ?? null,
        municipalInscription: input.municipalInscription ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.nfseRecipients.id, existing.id));
    revalidatePath("/app/fiscal");
    return { id: existing.id };
  }

  const recipientId = genId("rec");
  await db.insert(schema.nfseRecipients).values({
    id: recipientId,
    familyId,
    documentType: input.documentType,
    documentNumber: doc,
    name: input.name.trim(),
    email: input.email ?? null,
    municipalInscription: input.municipalInscription ?? null,
    address: input.address ?? null,
    notes: input.notes ?? null,
  });
  revalidatePath("/app/fiscal");
  return { id: recipientId };
}

export async function listRecipients(familyId: string) {
  return db
    .select()
    .from(schema.nfseRecipients)
    .where(eq(schema.nfseRecipients.familyId, familyId))
    .orderBy(schema.nfseRecipients.name);
}

export async function deleteRecipient(recipientId: string): Promise<void> {
  const familyId = await requireFamily();
  await db
    .delete(schema.nfseRecipients)
    .where(
      and(
        eq(schema.nfseRecipients.id, recipientId),
        eq(schema.nfseRecipients.familyId, familyId),
      ),
    );
  revalidatePath("/app/fiscal");
}
