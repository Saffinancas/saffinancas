import { listPlannedForMonth } from "@/lib/planned";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { PrevistoClient } from "./client";

export const dynamic = "force-dynamic";

export default async function PrevistoPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const [summary, cats] = await Promise.all([
    listPlannedForMonth(m),
    db
      .select({ id: schema.categories.id, name: schema.categories.name })
      .from(schema.categories)
      .where(eq(schema.categories.familyId, familyId)),
  ]);

  return <PrevistoClient initial={summary} categories={cats} />;
}
