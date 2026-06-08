import { db, schema } from "@cofre/db";
import { decrypt } from "@/lib/crypto";
import {
  SETTINGS_REGISTRY,
  type SettingDef,
} from "@/lib/platform-settings-registry";
import { SettingsList, type SettingState } from "./settings-list";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

function maskValue(plain: string, sensitive: boolean): string {
  if (!sensitive) return plain;
  if (plain.length <= 4) return "····";
  return "····" + plain.slice(-4);
}

function previewFor(
  row: { value: string | null; encrypted: boolean } | null,
  def: SettingDef | null,
  envVar: string | undefined,
): { hasStoredValue: boolean; preview: string | null; encrypted: boolean; envDefined: boolean } {
  const envDefined = envVar ? Boolean(process.env[envVar]?.trim()) : false;
  if (!row || row.value === null) {
    return { hasStoredValue: false, preview: null, encrypted: false, envDefined };
  }
  let plain = row.value;
  if (row.encrypted) {
    try {
      plain = decrypt(row.value);
    } catch {
      return { hasStoredValue: true, preview: "····", encrypted: true, envDefined };
    }
  }
  const sensitive = def?.sensitive ?? row.encrypted;
  return {
    hasStoredValue: true,
    preview: maskValue(plain, sensitive),
    encrypted: row.encrypted,
    envDefined,
  };
}

export default async function AdminConfigPage() {
  const rows = await db.select().from(schema.platformSettings);
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const states: Record<string, SettingState> = {};
  for (const def of SETTINGS_REGISTRY) {
    const row = byKey.get(def.key) ?? null;
    const info = previewFor(row, def, def.envVar);
    states[def.key] = {
      key: def.key,
      hasStoredValue: info.hasStoredValue,
      preview: info.preview,
      encrypted: info.encrypted,
      envDefined: info.envDefined,
    };
  }

  const knownKeys = new Set(SETTINGS_REGISTRY.map((d) => d.key));
  const extras = rows
    .filter((r) => !knownKeys.has(r.key))
    .map((r) => {
      const info = previewFor(r, null, undefined);
      return {
        key: r.key,
        preview: info.preview,
        encrypted: r.encrypted,
      };
    });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma · Configurações"
        title={
          <>
            Variáveis da <span className="display-serif italic">plataforma</span>
          </>
        }
        description="Valores salvos no banco (criptografados, quando marcados como secret) sobrescrevem env vars equivalentes em runtime — sem precisar editar .env."
        tone="primary"
      />

      <p className="text-xs text-[var(--color-fg-subtle)]">
        As marcadas como <strong>env-only</strong> são lidas no boot (DB, chave-mestra,
        secret de sessão) e só podem ser alteradas na Vercel.
      </p>

      <SettingsList registry={SETTINGS_REGISTRY} states={states} extras={extras} />
    </div>
  );
}
