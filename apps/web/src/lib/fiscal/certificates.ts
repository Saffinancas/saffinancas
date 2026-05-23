"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/crypto";
import { id as genId } from "@/lib/ids";

/**
 * Server actions pra gestão de certificados digitais A1 (.pfx).
 *
 * Armazenamento:
 *  - PFX inteiro: base64 + AES-256-GCM
 *  - Senha: AES-256-GCM
 *  - Validade: extraída do PFX se possível (em fase real com node-forge);
 *    por ora, usuário informa.
 *
 * **Importante**: a senha do certificado NUNCA é exibida de volta. Pra trocar,
 * o usuário faz upload novamente.
 */

async function requireFamily(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const u = session.user as { familyId?: string | null };
  if (!u.familyId) throw new Error("Sem família.");
  return u.familyId;
}

export async function uploadCertificate(input: {
  fileName: string;
  pfxBase64: string;
  password: string;
  subjectCn?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
}): Promise<{ ok: true; certificateId: string } | { ok: false; error: string }> {
  if (!input.pfxBase64 || input.pfxBase64.length < 100) {
    return { ok: false, error: "Arquivo .pfx inválido." };
  }
  if (!input.password) {
    return { ok: false, error: "Informe a senha do certificado." };
  }

  const familyId = await requireFamily();

  // Desativa todos os outros certificados ativos (só um pode estar ativo).
  await db
    .update(schema.fiscalCertificates)
    .set({ isActive: false, revokedAt: new Date() })
    .where(
      and(
        eq(schema.fiscalCertificates.familyId, familyId),
        eq(schema.fiscalCertificates.isActive, true),
      ),
    );

  const certId = genId("crt");
  await db.insert(schema.fiscalCertificates).values({
    id: certId,
    familyId,
    fileName: input.fileName,
    pfxEnc: encrypt(input.pfxBase64),
    passwordEnc: encrypt(input.password),
    subjectCn: input.subjectCn ?? null,
    validFrom: input.validFrom ? new Date(input.validFrom) : null,
    validUntil: input.validUntil ? new Date(input.validUntil) : null,
    isActive: true,
  });

  revalidatePath("/app/fiscal/perfil");
  return { ok: true, certificateId: certId };
}

export async function revokeCertificate(certificateId: string): Promise<void> {
  const familyId = await requireFamily();
  await db
    .update(schema.fiscalCertificates)
    .set({ isActive: false, revokedAt: new Date() })
    .where(
      and(
        eq(schema.fiscalCertificates.id, certificateId),
        eq(schema.fiscalCertificates.familyId, familyId),
      ),
    );
  revalidatePath("/app/fiscal/perfil");
}

export async function listCertificates(familyId: string) {
  return db
    .select({
      id: schema.fiscalCertificates.id,
      fileName: schema.fiscalCertificates.fileName,
      subjectCn: schema.fiscalCertificates.subjectCn,
      validFrom: schema.fiscalCertificates.validFrom,
      validUntil: schema.fiscalCertificates.validUntil,
      isActive: schema.fiscalCertificates.isActive,
      uploadedAt: schema.fiscalCertificates.uploadedAt,
    })
    .from(schema.fiscalCertificates)
    .where(eq(schema.fiscalCertificates.familyId, familyId))
    .orderBy(desc(schema.fiscalCertificates.uploadedAt));
}

/**
 * Recupera certificado ativo decryptado — uso **server-side apenas** (nunca
 * retornar para client). Usado pelos adapters de provider que precisam do
 * PFX (PBH direct).
 */
export async function getActiveCertificateDecrypted(
  familyId: string,
): Promise<{ pfxBase64: string; password: string } | null> {
  const [cert] = await db
    .select()
    .from(schema.fiscalCertificates)
    .where(
      and(
        eq(schema.fiscalCertificates.familyId, familyId),
        eq(schema.fiscalCertificates.isActive, true),
      ),
    )
    .limit(1);
  if (!cert) return null;
  try {
    return {
      pfxBase64: decrypt(cert.pfxEnc),
      password: decrypt(cert.passwordEnc),
    };
  } catch {
    return null;
  }
}
