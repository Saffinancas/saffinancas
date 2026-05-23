import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, Users, FileDown, AlertTriangle, ArrowRight } from "lucide-react";
import { ConfigForm } from "./config-form";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const [family] = await db
    .select()
    .from(schema.families)
    .where(eq(schema.families.id, familyId))
    .limit(1);

  if (!family) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Tudo que muda como a plataforma se comporta pra sua família.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Família</CardTitle>
          <CardDescription>Como vocês são identificados internamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigForm
            family={{
              id: family.id,
              name: family.name,
              notifyOnCapture: family.notifyOnCapture,
            }}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <SettingLink
          href="/app/config/ia"
          icon={BrainCircuit}
          title={family.byokEnabled ? "Sua chave de IA" : "Provedor de IA"}
          desc={
            family.byokEnabled
              ? family.byokApiKeyEnc
                ? "Você está usando sua própria chave."
                : "Cadastre sua chave de API."
              : "Gerenciado pela equipe Saf."
          }
        />
        <SettingLink
          href="/app/categorias"
          icon={Users}
          title="Categorias"
          desc="Criar, renomear, arquivar."
        />
        <SettingLink
          href="/app/cobranca"
          icon={ArrowRight}
          title="Plano e cobrança"
          desc="Status do trial e meio de pagamento."
        />
        <SettingLink
          href="/api/me/export"
          icon={FileDown}
          title="Exportar meus dados (LGPD)"
          desc="ZIP com tudo o que temos sobre você."
        />
      </div>

      <Card className="border-[var(--color-expense)]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--color-expense)]">
            <AlertTriangle className="h-4 w-4" /> Zona de perigo
          </CardTitle>
          <CardDescription>
            Excluir todos os seus dados. Levamos 30 dias pra processar (período em que você
            pode cancelar a solicitação).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/app/config/excluir"
            className="text-sm font-medium text-[var(--color-expense)] underline-offset-4 hover:underline"
          >
            Solicitar exclusão de conta →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-soft transition-colors hover:bg-[var(--color-surface-muted)]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-[var(--radius)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-[var(--color-fg-muted)]">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-[var(--color-fg-subtle)] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

