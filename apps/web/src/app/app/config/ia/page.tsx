import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { maskKey } from "@/lib/crypto";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, ShieldCheck } from "lucide-react";
import { ByokForm } from "./byok-form";

export const dynamic = "force-dynamic";

export default async function IaConfigPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const [family] = await db
    .select()
    .from(schema.families)
    .where(eq(schema.families.id, familyId))
    .limit(1);

  if (!family) return null;

  // CASO 1: admin não habilitou BYOK → cliente NÃO vê qual IA está sendo usada.
  if (!family.byokEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Provedor de IA</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            A classificação por IA está incluída na sua assinatura.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
              Processamento gerenciado pela Saf
            </CardTitle>
            <CardDescription>
              A equipe Saf escolhe o motor de IA, mantém os custos sob controle e cuida pra
              que todas as chamadas usem APIs com a flag de &ldquo;não treinar com seus
              dados&rdquo; ativada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-fg-muted)]">
              Não exibimos qual motor está em uso porque essa escolha é interna — pode mudar
              a qualquer momento conforme custo e qualidade evoluem.
            </div>
            <p className="mt-4 text-xs text-[var(--color-fg-subtle)]">
              Quer usar sua própria chave de IA? Fale com a equipe Saf — temos um modo para
              clientes que preferem pagar a IA direto no provedor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // CASO 2: BYOK habilitado pelo admin → cliente vê o estado atual e pode cadastrar a chave.
  const hasKey = !!family.byokApiKeyEnc;
  const masked = hasKey && family.byokApiKeyEnc ? maskKey(family.byokApiKeyEnc) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sua chave de IA</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          A administração liberou que você use a sua própria chave de API de IA. Quando você
          cadastra uma, as classificações da sua família passam a ser pagas diretamente no
          seu provedor — não na sua mensalidade da Saf.
        </p>
      </div>

      {hasKey ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[var(--color-income)]" />
              Sua chave está ativa
            </CardTitle>
            <CardDescription>
              Provedor: <strong>{labelFor(family.byokProvider)}</strong>. Mostramos apenas os
              últimos 4 caracteres — a chave completa fica criptografada no nosso banco.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                  Chave armazenada
                </p>
                <p className="num mt-0.5 font-mono text-sm">{masked}</p>
              </div>
            </div>

            <p className="mt-4 text-xs text-[var(--color-fg-subtle)]">
              Quer trocar de chave ou de provedor? Salve uma nova abaixo — substituímos.
            </p>

            <div className="mt-4">
              <ByokForm
                hasExisting
                initialProvider={
                  family.byokProvider === "openai" || family.byokProvider === "gemini"
                    ? family.byokProvider
                    : "claude"
                }
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[var(--color-primary)]" />
              Cadastrar sua chave
            </CardTitle>
            <CardDescription>
              Sua chave é armazenada criptografada (AES-256-GCM) e usada exclusivamente para
              classificar as mensagens da sua família.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ByokForm hasExisting={false} />
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-[var(--color-fg-subtle)]">
        Quer voltar pra modelo padrão (Saf cuida da IA)?{" "}
        <Link
          href="mailto:ajuda@saffinancas.com.br"
          className="underline-offset-4 hover:underline"
        >
          Fale com a gente
        </Link>{" "}
        — desativamos seu BYOK e ficamos no esquema da assinatura.
      </p>
    </div>
  );
}

function labelFor(p: string | null | undefined): string {
  if (!p) return "—";
  return (
    {
      claude: "Claude (Anthropic)",
      openai: "GPT (OpenAI)",
      gemini: "Gemini (Google)",
    }[p] ?? p
  );
}
