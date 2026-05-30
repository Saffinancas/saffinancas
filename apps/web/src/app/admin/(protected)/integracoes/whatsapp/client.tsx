"use client";

import * as React from "react";
import { Loader2, Eye, EyeOff, KeyRound, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveWhatsappConfig, generateMetaVerifyToken } from "./actions";
import type { WhatsappProviderId } from "@/lib/whatsapp-providers/labels";
import { PROVIDER_LABELS } from "@/lib/whatsapp-providers/labels";

type SettingMap = Record<string, { masked: string | null; hasValue: boolean }>;

const PROVIDER_OPTIONS: Array<{ id: WhatsappProviderId; help: string }> = [
  { id: "sim", help: "Simulado, sem WhatsApp real. Use em demos e dev." },
  { id: "web_js", help: "Cliente pareia QR. Funciona em grupos, mas sessão pode expirar." },
  { id: "twilio_sandbox", help: "Twilio sandbox — só DM 1:1 com o bot. Ótimo pra testar HOJE." },
  { id: "twilio_production", help: "Twilio com número aprovado. Suporta grupos. Custo por msg." },
  { id: "meta_cloud", help: "Meta WhatsApp Cloud API direto. DM 1:1, mais barato em escala." },
];

export function WhatsappAdminClient({
  initialProvider,
  initialSettings,
}: {
  initialProvider: WhatsappProviderId;
  initialSettings: SettingMap;
}) {
  const [provider, setProvider] = React.useState<WhatsappProviderId>(initialProvider);
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Twilio
  const [twAccountSid, setTwAccountSid] = React.useState("");
  const [twAuthToken, setTwAuthToken] = React.useState("");
  const [twFrom, setTwFrom] = React.useState("");

  // Meta
  const [mtPhoneId, setMtPhoneId] = React.useState("");
  const [mtAccessToken, setMtAccessToken] = React.useState("");
  const [mtVerifyToken, setMtVerifyToken] = React.useState("");
  const [mtAppSecret, setMtAppSecret] = React.useState("");
  const [mtDisplayNumber, setMtDisplayNumber] = React.useState("");

  async function handleSave() {
    setLoading(true);
    setMsg(null);
    const res = await saveWhatsappConfig({
      provider,
      twilio:
        provider === "twilio_sandbox" || provider === "twilio_production"
          ? {
              accountSid: twAccountSid || undefined,
              authToken: twAuthToken || undefined,
              from: twFrom || undefined,
            }
          : undefined,
      meta:
        provider === "meta_cloud"
          ? {
              phoneNumberId: mtPhoneId || undefined,
              accessToken: mtAccessToken || undefined,
              verifyToken: mtVerifyToken || undefined,
              appSecret: mtAppSecret || undefined,
              displayNumber: mtDisplayNumber || undefined,
            }
          : undefined,
    });
    setLoading(false);
    if (res.ok) {
      setMsg({ kind: "ok", text: "Configuração salva." });
      // Limpa campos de secret (já gravados)
      setTwAuthToken("");
      setMtAccessToken("");
      setMtAppSecret("");
    } else {
      setMsg({ kind: "err", text: res.error });
    }
  }

  async function gerarVerifyToken() {
    const t = await generateMetaVerifyToken();
    setMtVerifyToken(t);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Provedor</Label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setProvider(opt.id)}
              className={
                "flex flex-col gap-1 rounded-[var(--radius)] border p-3 text-left text-xs transition " +
                (provider === opt.id
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]/30"
                  : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50")
              }
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                {provider === opt.id && <Check className="h-3.5 w-3.5 text-[var(--color-primary)]" />}
                {PROVIDER_LABELS[opt.id]}
              </span>
              <span className="text-[var(--color-fg-muted)]">{opt.help}</span>
            </button>
          ))}
        </div>
      </div>

      {(provider === "twilio_sandbox" || provider === "twilio_production") && (
        <TwilioFields
          provider={provider}
          settings={initialSettings}
          twAccountSid={twAccountSid}
          twAuthToken={twAuthToken}
          twFrom={twFrom}
          setTwAccountSid={setTwAccountSid}
          setTwAuthToken={setTwAuthToken}
          setTwFrom={setTwFrom}
        />
      )}

      {provider === "meta_cloud" && (
        <MetaFields
          settings={initialSettings}
          mtPhoneId={mtPhoneId}
          mtAccessToken={mtAccessToken}
          mtVerifyToken={mtVerifyToken}
          mtAppSecret={mtAppSecret}
          mtDisplayNumber={mtDisplayNumber}
          setMtPhoneId={setMtPhoneId}
          setMtAccessToken={setMtAccessToken}
          setMtVerifyToken={setMtVerifyToken}
          setMtAppSecret={setMtAppSecret}
          setMtDisplayNumber={setMtDisplayNumber}
          gerarVerifyToken={gerarVerifyToken}
        />
      )}

      {msg && (
        <div
          className={
            "flex items-center gap-2 rounded-[var(--radius)] border px-3 py-2 text-xs " +
            (msg.kind === "ok"
              ? "border-[var(--color-income)]/30 bg-[var(--color-income-soft)] text-[var(--color-income)]"
              : "border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] text-[var(--color-expense)]")
          }
        >
          {msg.kind === "ok" ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {msg.text}
        </div>
      )}

      <Button onClick={handleSave} disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar configuração
      </Button>
    </div>
  );
}

function TwilioFields({
  provider,
  settings,
  twAccountSid,
  twAuthToken,
  twFrom,
  setTwAccountSid,
  setTwAuthToken,
  setTwFrom,
}: {
  provider: WhatsappProviderId;
  settings: SettingMap;
  twAccountSid: string;
  twAuthToken: string;
  twFrom: string;
  setTwAccountSid: (s: string) => void;
  setTwAuthToken: (s: string) => void;
  setTwFrom: (s: string) => void;
}) {
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/whatsapp/twilio/webhook`
      : "/api/whatsapp/twilio/webhook";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Credenciais Twilio</CardTitle>
        <CardDescription>
          Pegue na console Twilio em <strong>Account → API keys & tokens</strong>. Para sandbox,
          o número &quot;From&quot; padrão é <code>whatsapp:+14155238886</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <SecretField
            label="Account SID"
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={twAccountSid}
            onChange={setTwAccountSid}
            stored={settings["whatsapp.twilio.account_sid"]?.masked ?? null}
          />
          <SecretField
            label="Auth Token"
            placeholder="seu auth token"
            value={twAuthToken}
            onChange={setTwAuthToken}
            stored={settings["whatsapp.twilio.auth_token"]?.masked ?? null}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tw-from">Número From (com prefixo whatsapp:)</Label>
          <Input
            id="tw-from"
            placeholder={
              provider === "twilio_sandbox"
                ? "whatsapp:+14155238886"
                : "whatsapp:+5511XXXXXXXXX"
            }
            value={twFrom}
            onChange={(e) => setTwFrom(e.target.value)}
          />
          {settings["whatsapp.twilio.from"]?.masked && (
            <p className="text-[10px] text-[var(--color-fg-subtle)]">
              Atual: {settings["whatsapp.twilio.from"]?.masked}
            </p>
          )}
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs">
          <p className="font-medium">Webhook URL pra Twilio</p>
          <code className="mt-1 block break-all text-[10px]">{webhookUrl}</code>
          <p className="mt-1 text-[var(--color-fg-muted)]">
            Cola essa URL no console Twilio em Messaging → Settings → WhatsApp sandbox settings
            (ou no número aprovado) campo <strong>When a message comes in</strong>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaFields({
  settings,
  mtPhoneId,
  mtAccessToken,
  mtVerifyToken,
  mtAppSecret,
  mtDisplayNumber,
  setMtPhoneId,
  setMtAccessToken,
  setMtVerifyToken,
  setMtAppSecret,
  setMtDisplayNumber,
  gerarVerifyToken,
}: {
  settings: SettingMap;
  mtPhoneId: string;
  mtAccessToken: string;
  mtVerifyToken: string;
  mtAppSecret: string;
  mtDisplayNumber: string;
  setMtPhoneId: (s: string) => void;
  setMtAccessToken: (s: string) => void;
  setMtVerifyToken: (s: string) => void;
  setMtAppSecret: (s: string) => void;
  setMtDisplayNumber: (s: string) => void;
  gerarVerifyToken: () => void;
}) {
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/whatsapp/meta/webhook`
      : "/api/whatsapp/meta/webhook";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Credenciais Meta Cloud API</CardTitle>
        <CardDescription>
          Pega no Meta Business Manager → WhatsApp → API Setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <SecretField
            label="Phone Number ID"
            placeholder="1234567890"
            value={mtPhoneId}
            onChange={setMtPhoneId}
            stored={settings["whatsapp.meta.phone_number_id"]?.masked ?? null}
          />
          <SecretField
            label="Access Token"
            placeholder="EAAxxx..."
            value={mtAccessToken}
            onChange={setMtAccessToken}
            stored={settings["whatsapp.meta.access_token"]?.masked ?? null}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mt-display">Número visível (display number, ex: +5511999999999)</Label>
          <Input
            id="mt-display"
            placeholder="+5511999999999"
            value={mtDisplayNumber}
            onChange={(e) => setMtDisplayNumber(e.target.value)}
          />
          {settings["whatsapp.meta.display_number"]?.masked && (
            <p className="text-[10px] text-[var(--color-fg-subtle)]">
              Atual: {settings["whatsapp.meta.display_number"]?.masked}
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mt-verify">Verify Token (escolha um valor)</Label>
            <div className="flex gap-2">
              <Input
                id="mt-verify"
                placeholder="qualquer-string-secreta"
                value={mtVerifyToken}
                onChange={(e) => setMtVerifyToken(e.target.value)}
              />
              <Button type="button" variant="secondary" size="sm" onClick={gerarVerifyToken}>
                <KeyRound className="h-3.5 w-3.5" /> Gerar
              </Button>
            </div>
            {settings["whatsapp.meta.verify_token"]?.masked && (
              <p className="text-[10px] text-[var(--color-fg-subtle)]">
                Atual: {settings["whatsapp.meta.verify_token"]?.masked}
              </p>
            )}
          </div>
          <SecretField
            label="App Secret (HMAC webhook)"
            placeholder="opcional, mas recomendado"
            value={mtAppSecret}
            onChange={setMtAppSecret}
            stored={settings["whatsapp.meta.app_secret"]?.masked ?? null}
          />
        </div>
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs">
          <p className="font-medium">Configure no Meta Developer Portal</p>
          <p className="mt-1">Webhook URL: <code className="break-all text-[10px]">{webhookUrl}</code></p>
          <p>Verify Token: <code className="break-all text-[10px]">{mtVerifyToken || "(defina acima)"}</code></p>
          <p className="mt-1 text-[var(--color-fg-muted)]">
            No painel da Meta, em WhatsApp → Configuration → Webhook, subscreva ao campo{" "}
            <strong>messages</strong>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SecretField({
  label,
  value,
  onChange,
  placeholder,
  stored,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  stored: string | null;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Esconder" : "Mostrar"}
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {stored && (
        <Badge variant="default">salvo: {stored}</Badge>
      )}
    </div>
  );
}
