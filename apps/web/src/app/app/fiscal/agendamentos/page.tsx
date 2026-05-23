import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listSchedules } from "@/lib/fiscal/schedules";
import { listRecipients } from "@/lib/fiscal/recipients";
import { getProfileForFamily } from "@/lib/fiscal/profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { SchedulesClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AgendamentosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const profile = await getProfileForFamily(familyId);
  const [schedules, recipients] = await Promise.all([
    listSchedules(familyId),
    listRecipients(familyId),
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
        <h1 className="text-2xl font-semibold tracking-tight">Agendamentos de NFSe</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Configure emissão automática mensal. Exemplo: todo dia 10 emitir R$ 10.000 pra um
          mesmo tomador, com os emails que recebem o XML e o DANFE.
        </p>
      </div>

      {!profile ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Cadastre o perfil fiscal antes</CardTitle>
            <CardDescription>
              Sem perfil cadastrado não dá pra emitir nada — nem manual, nem automático.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/app/fiscal/perfil"
              className="text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Ir pro perfil →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <SchedulesClient
          schedules={schedules.map((s) => ({
            id: s.id,
            label: s.label,
            dayOfMonth: s.dayOfMonth,
            serviceValueCents: Number(s.serviceValueCents),
            serviceDescription: s.serviceDescription,
            status: s.status,
            nextRunAt: s.nextRunAt?.toISOString() ?? null,
            lastRunAt: s.lastRunAt?.toISOString() ?? null,
            invoicesIssued: s.invoicesIssued,
            emailRecipients: (s.emailRecipients as string[]) ?? [],
            recipientName: s.recipientName ?? "—",
            recipientId: s.recipientId,
          }))}
          recipients={recipients.map((r) => ({
            id: r.id,
            name: r.name,
            documentNumber: r.documentNumber,
            email: r.email,
          }))}
        />
      )}
    </div>
  );
}
