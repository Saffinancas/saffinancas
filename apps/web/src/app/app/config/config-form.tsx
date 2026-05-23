"use client";

import * as React from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setFamilyName, setNotifyOnCapture } from "@/lib/family-settings";

export function ConfigForm({
  family,
}: {
  family: { id: string; name: string; notifyOnCapture: boolean };
}) {
  const [name, setName] = React.useState(family.name);
  const [notify, setNotify] = React.useState(family.notifyOnCapture);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function save() {
    setLoading(true);
    try {
      if (name.trim() !== family.name) await setFamilyName(name);
      if (notify !== family.notifyOnCapture) await setNotifyOnCapture(notify);
      setSavedAt(Date.now());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fam-name">Nome da família</Label>
        <Input id="fam-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)]"
        />
        <span>
          Responder no grupo a cada transação (&ldquo;✅ R$ 320,00 registrado em Mercado&rdquo;).
          <br />
          <span className="text-xs text-[var(--color-fg-subtle)]">
            Algumas famílias acham invasivo — desligado por padrão.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </Button>
        {savedAt && Date.now() - savedAt < 5000 && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-income)]">
            <Check className="h-3 w-3" /> Salvo.
          </span>
        )}
      </div>
    </div>
  );
}
