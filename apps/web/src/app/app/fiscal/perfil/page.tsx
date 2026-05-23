import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getProfileForFamily } from "@/lib/fiscal/profile";
import { listCertificates } from "@/lib/fiscal/certificates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { CertificateSection } from "./certificate-section";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const [profile, certificates] = await Promise.all([
    getProfileForFamily(familyId),
    listCertificates(familyId),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/app/fiscal"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil fiscal</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Dados do prestador, regime tributário, provider de emissão e certificado digital.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do prestador</CardTitle>
          <CardDescription>
            Aparece em toda NFSe emitida. CNPJ + Inscrição Municipal precisam estar cadastrados
            na prefeitura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initial={
              profile
                ? {
                    documentType: profile.documentType as "PF" | "PJ",
                    documentNumber: profile.documentNumber,
                    legalName: profile.legalName,
                    tradeName: profile.tradeName,
                    municipalInscription: profile.municipalInscription,
                    stateInscription: profile.stateInscription,
                    cityCode: profile.cityCode,
                    cityName: profile.cityName,
                    stateCode: profile.stateCode,
                    address: profile.address as Record<string, string>,
                    contactEmail: profile.contactEmail,
                    contactPhone: profile.contactPhone,
                    regime: profile.regime,
                    preferredProvider: profile.preferredProvider,
                    environment: profile.environment as "homologacao" | "producao",
                  }
                : null
            }
          />
        </CardContent>
      </Card>

      <CertificateSection
        certificates={certificates.map((c) => ({
          id: c.id,
          fileName: c.fileName,
          subjectCn: c.subjectCn,
          validFrom: c.validFrom?.toISOString() ?? null,
          validUntil: c.validUntil?.toISOString() ?? null,
          isActive: c.isActive,
          uploadedAt: c.uploadedAt.toISOString(),
        }))}
      />
    </div>
  );
}
