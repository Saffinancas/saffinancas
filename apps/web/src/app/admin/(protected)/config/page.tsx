import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

const envSlots = [
  {
    section: "Pagar.me",
    keys: [
      { key: "PAGARME_API_KEY", desc: "Chave secreta (server-side)" },
      { key: "PAGARME_PUBLIC_KEY", desc: "Chave pública (front)" },
      { key: "PAGARME_WEBHOOK_SECRET", desc: "Secret do webhook" },
    ],
  },
  {
    section: "Provedores de IA",
    keys: [
      { key: "ANTHROPIC_API_KEY", desc: "Claude" },
      { key: "OPENAI_API_KEY", desc: "GPT" },
      { key: "GOOGLE_GENERATIVE_AI_API_KEY", desc: "Gemini" },
    ],
  },
  {
    section: "Pluggy (Open Finance)",
    keys: [
      { key: "PLUGGY_CLIENT_ID", desc: "Client ID" },
      { key: "PLUGGY_CLIENT_SECRET", desc: "Client secret" },
    ],
  },
  {
    section: "WhatsApp",
    keys: [
      { key: "WHATSAPP_MODE", desc: "sim (padrão dev) ou real (quando worker estiver rodando)" },
      { key: "WHATSAPP_SESSION_DIR", desc: "Volume da sessão whatsapp-web.js" },
    ],
  },
  {
    section: "Infraestrutura",
    keys: [
      { key: "DATABASE_URL", desc: "PGlite local (vazio) ou Postgres da nuvem" },
      { key: "REDIS_URL", desc: "Fila BullMQ (worker WhatsApp)" },
      { key: "RESEND_API_KEY", desc: "Email transacional" },
      { key: "R2_ACCESS_KEY_ID", desc: "Cloudflare R2 (comprovantes)" },
      { key: "SENTRY_DSN", desc: "Observabilidade" },
    ],
  },
];

export default function AdminConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações da plataforma</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Status das variáveis sensíveis. Por segurança, mostramos só se estão presentes (não o
          valor). Edite em <code>.env.local</code> e reinicie o dev server.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/60 p-3 text-xs text-[var(--color-primary)]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">
            Quando você plugar chaves reais aqui, os adapters trocam automaticamente
            de modo simulado pra modo real.
          </p>
          <p className="mt-0.5">
            Sem alterar uma linha de código: <code>PAGARME_API_KEY</code> presente → checkout
            real. <code>WHATSAPP_MODE=real</code> + worker no ar → captura real.
          </p>
        </div>
      </div>

      {envSlots.map((s) => (
        <Card key={s.section}>
          <CardHeader>
            <CardTitle>{s.section}</CardTitle>
            <CardDescription>Variáveis de ambiente esperadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-[var(--color-border)]">
              {s.keys.map((k) => {
                const present = !!process.env[k.key];
                return (
                  <li key={k.key} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-mono text-xs">{k.key}</p>
                      <p className="text-xs text-[var(--color-fg-muted)]">{k.desc}</p>
                    </div>
                    <Badge variant={present ? "income" : "default"}>
                      {present ? "definido" : "vazio"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
