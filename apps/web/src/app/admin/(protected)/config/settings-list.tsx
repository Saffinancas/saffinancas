"use client";

import * as React from "react";
import { Loader2, Pencil, Trash2, Eye, EyeOff, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  type SettingCategory,
  type SettingDef,
} from "@/lib/platform-settings-registry";
import {
  savePlatformSettingAction,
  deletePlatformSettingAction,
} from "./actions";

export type SettingState = {
  key: string;
  /** Existe row na tabela platform_settings? */
  hasStoredValue: boolean;
  /** Mostra valor mascarado se sensitive, ou plain se não. */
  preview: string | null;
  encrypted: boolean;
  /** A env var equivalente está definida? */
  envDefined: boolean;
};

type Props = {
  registry: SettingDef[];
  states: Record<string, SettingState>;
  /** Settings que existem no banco mas não estão no registry. */
  extras: Array<{ key: string; preview: string | null; encrypted: boolean }>;
};

export function SettingsList({ registry, states, extras }: Props) {
  const grouped = React.useMemo(() => {
    const m = new Map<SettingCategory, SettingDef[]>();
    for (const def of registry) {
      const arr = m.get(def.category) ?? [];
      arr.push(def);
      m.set(def.category, arr);
    }
    return Array.from(m.entries());
  }, [registry]);

  return (
    <div className="space-y-6">
      {grouped.map(([cat, defs]) => (
        <Card key={cat}>
          <CardHeader>
            <CardTitle className="text-base">{CATEGORY_LABEL[cat]}</CardTitle>
            <CardDescription>
              {cat === "infra"
                ? "Lidas no boot — só editáveis via Vercel."
                : "Editáveis aqui. Valor no banco sobrescreve a env var."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-[var(--color-border)]">
              {defs.map((def) => (
                <SettingRow key={def.key} def={def} state={states[def.key]!} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customizadas</CardTitle>
          <CardDescription>
            Chaves armazenadas no banco fora do catálogo. Útil pra features novas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddCustomSetting />
          {extras.length > 0 && (
            <ul className="divide-y divide-[var(--color-border)]">
              {extras.map((x) => (
                <CustomRow
                  key={x.key}
                  settingKey={x.key}
                  preview={x.preview}
                  encrypted={x.encrypted}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ state, readonly }: { state: SettingState; readonly: boolean }) {
  if (readonly) {
    return (
      <Badge variant={state.envDefined ? "income" : "default"}>
        {state.envDefined ? "env: definido" : "env: vazio"}
      </Badge>
    );
  }
  if (state.hasStoredValue) return <Badge variant="income">salvo no banco</Badge>;
  if (state.envDefined) return <Badge variant="default">via env</Badge>;
  return <Badge variant="default">vazio</Badge>;
}

function SettingRow({ def, state }: { def: SettingDef; state: SettingState }) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [reveal, setReveal] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await savePlatformSettingAction({
        key: def.key,
        value,
        encrypted: def.sensitive,
      });
      if (!res.ok) {
        setError(res.error);
      } else {
        setEditing(false);
        setValue("");
      }
    });
  }

  function onDelete() {
    if (!confirm(`Apagar ${def.label} do banco? A env var (se houver) volta a valer.`))
      return;
    setError(null);
    startTransition(async () => {
      const res = await deletePlatformSettingAction(def.key);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{def.label}</span>
            <StatusBadge state={state} readonly={def.readonly} />
            {def.sensitive && <Badge variant="default">secret</Badge>}
          </div>
          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{def.description}</p>
          <p className="mt-1 font-mono text-[11px] text-[var(--color-fg-subtle)]">
            {def.key} <span className="text-[var(--color-fg-muted)]/60">·</span>{" "}
            env: <code>{def.envVar}</code>
          </p>
          {state.preview && !editing && (
            <p className="mt-2 font-mono text-xs text-[var(--color-fg-muted)]">
              {def.sensitive && !reveal ? state.preview : state.preview}
            </p>
          )}
        </div>

        {!def.readonly && (
          <div className="flex shrink-0 items-center gap-1">
            {!editing && state.hasStoredValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={pending}
                aria-label="Apagar"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {!editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <Label htmlFor={`v-${def.key}`} className="sr-only">
              {def.label}
            </Label>
            <div className="relative">
              <Input
                id={`v-${def.key}`}
                type={def.sensitive && !reveal ? "password" : "text"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={def.placeholder ?? "Novo valor"}
                autoComplete="off"
                spellCheck={false}
                className={cn(def.sensitive && "pr-9")}
              />
              {def.sensitive && (
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                  aria-label={reveal ? "Ocultar" : "Mostrar"}
                >
                  {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" onClick={onSave} disabled={pending || !value}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Salvar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setValue("");
                setError(null);
              }}
              disabled={pending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-2 py-1.5 text-xs text-[var(--color-expense)]">
          {error}
        </p>
      )}
    </li>
  );
}

function CustomRow({
  settingKey,
  preview,
  encrypted,
}: {
  settingKey: string;
  preview: string | null;
  encrypted: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await savePlatformSettingAction({
        key: settingKey,
        value,
        encrypted,
      });
      if (!res.ok) setError(res.error);
      else {
        setEditing(false);
        setValue("");
      }
    });
  }

  function onDelete() {
    if (!confirm(`Apagar ${settingKey}?`)) return;
    startTransition(async () => {
      const res = await deletePlatformSettingAction(settingKey);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs">{settingKey}</p>
          <div className="mt-1 flex gap-2">
            {encrypted && <Badge variant="default">secret</Badge>}
            <Badge variant="income">salvo</Badge>
          </div>
          {preview && (
            <p className="mt-2 font-mono text-xs text-[var(--color-fg-muted)]">
              {preview}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onDelete} disabled={pending}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing((e) => !e)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 flex gap-2">
          <Input
            type={encrypted ? "password" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Novo valor"
            autoComplete="off"
          />
          <Button size="sm" onClick={onSave} disabled={pending || !value}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
        </div>
      )}
      {error && (
        <p className="mt-2 text-xs text-[var(--color-expense)]">{error}</p>
      )}
    </li>
  );
}

function AddCustomSetting() {
  const [open, setOpen] = React.useState(false);
  const [key, setKey] = React.useState("");
  const [value, setValue] = React.useState("");
  const [encrypted, setEncrypted] = React.useState(true);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await savePlatformSettingAction({ key, value, encrypted });
      if (!res.ok) setError(res.error);
      else {
        setOpen(false);
        setKey("");
        setValue("");
      }
    });
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Adicionar setting customizada
      </Button>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="custom-key" className="text-xs">
            Chave (formato dot.case)
          </Label>
          <Input
            id="custom-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="ex.: feature.dark_mode"
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="custom-value" className="text-xs">
            Valor
          </Label>
          <Input
            id="custom-value"
            type={encrypted ? "password" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-[var(--color-fg-muted)]">
        <input
          type="checkbox"
          checked={encrypted}
          onChange={(e) => setEncrypted(e.target.checked)}
        />
        Criptografar (recomendado para secrets)
      </label>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={onSave} disabled={pending || !key || !value}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salvar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setKey("");
            setValue("");
            setError(null);
          }}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-[var(--color-expense)]">{error}</p>
      )}
    </div>
  );
}
