"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Home, Car, Image as ImageIcon, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/utils";
import { createAsset } from "@/lib/patrimony";

type Asset = {
  id: string;
  name: string;
  type: "real_estate" | "vehicle" | "artwork" | "equipment" | "other";
  acquisitionDate: string;
  acquisitionCostCents: number;
  currentValueCents: number;
};

const TYPE_LABELS: Record<Asset["type"], { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  real_estate: { label: "Imóvel", icon: Home },
  vehicle: { label: "Veículo", icon: Car },
  artwork: { label: "Obra de arte", icon: ImageIcon },
  equipment: { label: "Equipamento", icon: Package },
  other: { label: "Outro", icon: Package },
};

export function PatrimonyClient({ assets }: { assets: Asset[] }) {
  const [open, setOpen] = React.useState(false);

  const totalValue = assets.reduce((acc, a) => acc + a.currentValueCents, 0);
  const totalCost = assets.reduce((acc, a) => acc + a.acquisitionCostCents, 0);
  const variation = totalValue - totalCost;
  const variationPct = totalCost > 0 ? (variation / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patrimônio</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Imóveis, veículos e outros bens. Aluguéis viram receita recorrente.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Cadastrar bem
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Valor atual" value={formatBRL(totalValue)} tone="primary" />
        <Stat label="Custo de aquisição" value={formatBRL(totalCost)} />
        <Stat
          label="Variação"
          value={`${formatBRL(variation)} (${variationPct >= 0 ? "+" : ""}${variationPct.toFixed(1)}%)`}
          tone={variation >= 0 ? "income" : "expense"}
        />
      </div>

      {assets.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
          <p className="text-sm font-medium">Nenhum bem cadastrado ainda</p>
          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
            Cadastre um imóvel pra começar a controlar valorização e aluguéis.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {assets.map((a) => {
            const meta = TYPE_LABELS[a.type];
            const variation = a.currentValueCents - a.acquisitionCostCents;
            const variationPct =
              a.acquisitionCostCents > 0 ? (variation / a.acquisitionCostCents) * 100 : 0;
            return (
              <Link
                key={a.id}
                href={`/app/patrimonio/${a.id}`}
                className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft transition-colors hover:bg-[var(--color-surface-muted)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-[var(--radius)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                      <meta.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold">{a.name}</p>
                      <p className="text-xs text-[var(--color-fg-muted)]">{meta.label}</p>
                    </div>
                  </div>
                  <Badge variant={variation >= 0 ? "income" : "expense"}>
                    {variation >= 0 ? "+" : ""}
                    {variationPct.toFixed(1)}%
                  </Badge>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <p className="display-serif tabular text-xl">
                    <span className="text-xs not-italic">R$</span>{" "}
                    {(a.currentValueCents / 100).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-[10px] text-[var(--color-fg-subtle)]">
                    Adquirido {new Date(a.acquisitionDate).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <AssetDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function AssetDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<Asset["type"]>("real_estate");
  const [acqDate, setAcqDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [acqCost, setAcqCost] = React.useState("");
  const [curValue, setCurValue] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setType("real_estate");
      setAcqDate(new Date().toISOString().slice(0, 10));
      setAcqCost("");
      setCurValue("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const acqCents = parseAmountToCents(acqCost);
    const curCents = curValue ? parseAmountToCents(curValue) : acqCents;
    if (!acqCents) {
      setError("Valor de aquisição inválido.");
      return;
    }
    setLoading(true);
    try {
      await createAsset({
        name,
        type,
        acquisitionDate: acqDate,
        acquisitionCostCents: acqCents,
        currentValueCents: curCents ?? acqCents,
        notes: notes || null,
      });
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar bem</DialogTitle>
          <DialogDescription>
            O bem entra na sua lista de patrimônio + ficha &ldquo;Bens e Direitos&rdquo; do IR.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-name">Nome</Label>
              <Input
                id="a-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Apartamento Vila Madalena"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-type">Tipo</Label>
              <select
                id="a-type"
                value={type}
                onChange={(e) => setType(e.target.value as Asset["type"])}
                className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="real_estate">Imóvel</option>
                <option value="vehicle">Veículo</option>
                <option value="artwork">Obra de arte</option>
                <option value="equipment">Equipamento</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-date">Data de aquisição</Label>
              <Input
                id="a-date"
                type="date"
                required
                value={acqDate}
                onChange={(e) => setAcqDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-cost">Valor pago (R$)</Label>
              <Input
                id="a-cost"
                inputMode="decimal"
                required
                value={acqCost}
                onChange={(e) => setAcqCost(e.target.value)}
                placeholder="450.000,00"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-current">Valor atual (opcional)</Label>
            <Input
              id="a-current"
              inputMode="decimal"
              value={curValue}
              onChange={(e) => setCurValue(e.target.value)}
              placeholder="(deixe vazio pra usar o valor de aquisição)"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-notes">Notas (opcional)</Label>
            <Input
              id="a-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Matrícula 123.456, Cartório 5º"
            />
          </div>
          {error && (
            <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "income" | "expense" | "primary";
}) {
  const ac =
    tone === "income"
      ? "text-[var(--color-income)]"
      : tone === "expense"
        ? "text-[var(--color-expense)]"
        : tone === "primary"
          ? "text-[var(--color-primary)]"
          : "text-[var(--color-fg)]";
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">{label}</p>
      <p className={"display-serif tabular mt-2 text-2xl " + ac}>{value}</p>
    </div>
  );
}
