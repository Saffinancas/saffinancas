import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listPlatformSettings } from "@/lib/platform-settings";
import { getActiveProviderId } from "@/lib/whatsapp-providers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WhatsappAdminClient } from "./client";
import { PROVIDER_LABELS } from "@/lib/whatsapp-providers";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Escolha qual provedor a plataforma usa pra capturar mensagens dos clientes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provedor ativo</CardTitle>
          <CardDescription>
            Atualmente: <strong>{PROVIDER_LABELS[activeProvider]}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsappAdminClient
            initialProvider={activeProvider}
            initialSettings={settingsMap}
          />
        </CardContent>
      </Card>
    </div>
  );
}
