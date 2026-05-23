"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { id as genId } from "@/lib/ids";
import type { FiscalProvider } from "./types";

type Regime = "mei" | "simples_nacional" | "lucro_presumido" | "lucro_real";

async function requireFamily(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const u = session.user as { familyId?: string | null };
  if (!u.familyId) throw new Error("Sem família.");
  return u.familyId;
}

export type FiscalProfileInput = {
  documentType: "PF" | "PJ";
  documentNumber: string;
  legalName: string;
  tradeName?: string | null;
  municipalInscription?: string | null;
  stateInscription?: string | null;
  cityCode: string;
  cityName: string;
  stateCode: string;
  address: {
    street: string;
    number: string;
    complement?: string | null;
    district: string;
    cityCode: string;
    cityName: string;
    stateCode: string;
    zipCode: string;
  };
  contactEmail?: string | null;
  contactPhone?: string | null;
  regime: Regime;
  preferredProvider: FiscalProvider;
  environment: "homologacao" | "producao";
};

export async function upsertFiscalProfile(input: FiscalProfileInput): Promise<void> {
  if (!input.documentNumber || !input.legalName) {
    throw new Error("Informe documento e razão social.");
  }
  const familyId = await requireFamily();

  const [existing] = await db
    .select()
    .from(schema.fiscalProfiles)
    .where(eq(schema.fiscalProfiles.familyId, familyId))
    .limit(1);

  const payload = {
    familyId,
    documentType: input.documentType,
    documentNumber: input.documentNumber.replace(/\D/g, ""),
    legalName: input.legalName.trim(),
    tradeName: input.tradeName ?? null,
    municipalInscription: input.municipalInscription ?? null,
    stateInscription: input.stateInscription ?? null,
    cityCode: input.cityCode,
    cityName: input.cityName,
    stateCode: input.stateCode,
    address: input.address,
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    regime: input.regime,
    preferredProvider: input.preferredProvider,
    environment: input.environment,
    updatedAt: new Date(),
  };

  if (existing) {
    await db
      .update(schema.fiscalProfiles)
      .set(payload)
      .where(eq(schema.fiscalProfiles.id, existing.id));
  } else {
    await db.insert(schema.fiscalProfiles).values({
      id: genId("fpr"),
      ...payload,
    });
  }

  revalidatePath("/app/fiscal");
  revalidatePath("/app/fiscal/perfil");
}

export async function getProfileForFamily(familyId: string) {
  const [profile] = await db
    .select()
    .from(schema.fiscalProfiles)
    .where(eq(schema.fiscalProfiles.familyId, familyId))
    .limit(1);
  return profile ?? null;
}
