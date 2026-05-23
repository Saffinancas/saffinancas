"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";

async function getFamilyId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const u = session.user as { familyId?: string | null };
  if (!u.familyId) throw new Error("Sem família.");
  return u.familyId;
}

export async function setAiProvider(provider: "claude" | "openai" | "gemini" | "auto") {
  const familyId = await getFamilyId();
  await db
    .update(schema.families)
    .set({ aiProvider: provider, updatedAt: new Date() })
    .where(eq(schema.families.id, familyId));
  revalidatePath("/app/config/ia");
}

export async function setNotifyOnCapture(notify: boolean) {
  const familyId = await getFamilyId();
  await db
    .update(schema.families)
    .set({ notifyOnCapture: notify, updatedAt: new Date() })
    .where(eq(schema.families.id, familyId));
  revalidatePath("/app/config");
}

export async function setFamilyName(name: string) {
  if (name.trim().length < 2) throw new Error("Nome muito curto.");
  const familyId = await getFamilyId();
  await db
    .update(schema.families)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(schema.families.id, familyId));
  revalidatePath("/app/config");
}
