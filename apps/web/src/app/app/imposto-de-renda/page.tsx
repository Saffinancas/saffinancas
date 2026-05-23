import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { buildIRReport } from "@/lib/ir";
import { IR_YEAR, IR_DECLARATION_YEAR } from "@/lib/ir-constants";
import { IRDashboard } from "./client";

export const dynamic = "force-dynamic";

export default async function IRPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; dep?: string; irrf?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const year = sp.year ? parseInt(sp.year, 10) : IR_YEAR;
  const dependents = sp.dep ? Math.max(0, parseInt(sp.dep, 10)) : 0;
  const irrf = sp.irrf
    ? Math.max(0, Math.round(parseFloat(sp.irrf.replace(",", ".")) * 100))
    : null;

  const report = await buildIRReport({
    familyId,
    year,
    dependents,
    withheldOverrideCents: irrf,
  });

  return (
    <IRDashboard
      report={report}
      declarationYear={year + 1}
      currentDeclarationYear={IR_DECLARATION_YEAR}
      irrfOverride={irrf}
    />
  );
}
