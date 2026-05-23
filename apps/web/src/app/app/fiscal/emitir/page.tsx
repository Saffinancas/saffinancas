import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfileForFamily } from "@/lib/fiscal/profile";
import { listRecipients } from "@/lib/fiscal/recipients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { EmitForm } from "./emit-form";

export const dynamic = "force-dynamic";

export default async function EmitirPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const profile = await getProfileForFamily(familyId);
  if (!profile) redirect("/app/fiscal/perfil");

  const recipients = await listRecipients(familyId);

  return (
    <div className="space-y-6">
      <Link
        href="/app/fiscal"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Emitir NFSe</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Prestador: <strong>{profile.legalName}</strong> · ISS recolhido em{" "}
          <strong>{profile.cityName}/{profile.stateCode}</strong>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da nota</CardTitle>
          <CardDescription>
            Tomador, valor, código de serviço e alíquota de ISS. Após emitir, você consegue
            cancelar pelo painel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmitForm
            recipients={recipients.map((r) => ({
              id: r.id,
              name: r.name,
              documentNumber: r.documentNumber,
              documentType: r.documentType as "PF" | "PJ",
              email: r.email,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
