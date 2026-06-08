import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ChevronRight, MessageSquare } from "lucide-react";
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

      {activeProvider === "web_js" && (
        <Section
          eyebrow="WhatsApp Web"
          title="Sessão Saf global"
          description="Pareie o número operacional Saf (1 chip que entra em todos os grupos das famílias clientes)."
        >
          <Link
            href="/admin/integracoes/whatsapp/saf-session"
            className="group flex items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop"
          >
            <div className="flex items-center gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-[var(--radius)] bg-[var(--color-income-soft)] text-[var(--color-income)]">
                <MessageSquare className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold tracking-tight">Parear chip Saf</p>
                <p className="text-xs text-[var(--color-fg-muted)]">
                  Código de 8 dígitos · sem QR · uma vez na vida do produto
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[var(--color-fg-muted)] transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Section>
      )}
    </div>
  );
}
