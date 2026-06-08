import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listPlatformSettings } from "@/lib/platform-settings";
import { getActiveProviderId } from "@/lib/whatsapp-providers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WhatsappAdminClient } from "./client";
import { PROVIDER_LABELS } from "@/lib/whatsapp-providers";
import { PageHeader, Section } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function WhatsappAdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");

  const [activeProvider, settings] = await Promise.all([
    getActiveProviderId(),
    listPlatformSettings("whatsapp."),
  ]);

  const settingsMap = Object.fromEntries(
    settings.map((s) => [s.key, { masked: s.masked, hasValue: s.hasValue }]),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma · WhatsApp"
        title={
          <>
            Provedor de <span className="display-serif italic">mensagens</span>
          </>
        }
        description="Escolha qual provedor a plataforma usa pra capturar mensagens dos clientes."
        tone="income"
      />

      <Section
        eyebrow="Conexão"
        title="Provedor ativo"
        description={`Atualmente: ${PROVIDER_LABELS[activeProvider]}`}
      >
        <Card>
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>
              Troque de provedor ou ajuste credenciais — alterações entram em vigor no
              próximo evento recebido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WhatsappAdminClient
              initialProvider={activeProvider}
              initialSettings={settingsMap}
            />
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
