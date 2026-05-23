"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveCustomerByokKey, removeCustomerByokKey } from "@/lib/family-byok";

type Provider = "claude" | "openai" | "gemini";

const PROVIDERS: Array<{ id: Provider; label: string; doc: string }> = [
  {
    id: "claude",
    label: "Claude (Anthropic)",
    doc: "Pegue em console.anthropic.com → Settings → API Keys. Começa com sk-ant-…",
  },
  {
    id: "openai",
    label: "GPT (OpenAI)",
    doc: "Pegue em platform.openai.com → API keys. Começa com sk-…",
  },
  {
    id: "gemini",
    label: "Gemini (Google)",
    doc: "Pegue em aistudio.google.com → Get API key.",
  },
];

export function ByokForm({
  hasExisting,
  initialProvider = "claude",
}: {
  hasExisting: boolean;
  initialProvider?: Provider;
}) {
  const router = useRouter();
  const [provider, setProvider] = React.useState<Provider>(initialProvider);
  const [apiKey, setApiKey] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const docLine = PROVIDERS.find((p) => p.id === provider)?.doc ?? "";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await saveCustomerByokKey({ provider, apiKey });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setApiKey("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Apagar sua chave de IA? As classificações voltam a usar a IA padrão da Saf."))
      return;
    setRemoving(true);
    try {
      await removeCustomerByokKey();
      router.refresh();
    } finally {
      setRemoving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="byok-provider">Provedor</Label>
        <select
          id="byok-provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as Provider)}
          className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-[var(--color-fg-subtle)]">{docLine}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="byok-key">
          {hasExisting ? "Nova chave (substitui a atual)" : "Chave de API"}
        </Label>
        <Input
          id="byok-key"
          type="password"
          autoComplete="off"
          required
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            provider === "claude"
              ? "sk-ant-api03-..."
              : provider === "openai"
                ? "sk-proj-..."
                : "AIzaSy..."
          }
        />
        <p className="text-[11px] text-[var(--color-fg-subtle)]">
          Armazenada com AES-256-GCM. A gente nunca exibe o valor completo depois.
        </p>
      </div>

      {error && (
        <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={loading || removing}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {hasExisting ? "Substituir chave" : "Salvar chave"}
        </Button>
        {hasExisting && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleRemove}
            disabled={loading || removing}
            className="text-[var(--color-expense)] hover:bg-[var(--color-expense-soft)]"
          >
            {removing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Apagar chave
          </Button>
        )}
      </div>
    </form>
  );
}
