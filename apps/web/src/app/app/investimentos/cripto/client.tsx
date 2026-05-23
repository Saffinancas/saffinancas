"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Bitcoin, RefreshCw } from "lucide-react";
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
import { createCryptoHolding, deleteCryptoHolding } from "@/lib/investments";
import { refreshCryptoQuotes } from "@/lib/quotes";

type Holding = {
  id: string;
  symbol: string;
  name: string;
  venue: string;
  quantity: number;
  avgCostCents: number;
  currentPriceCents: number | null;
  walletAddress: string | null;
};

export function CryptoClient({ holdings }: { holdings: Holding[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshResult, setRefreshResult] = React.useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await refreshCryptoQuotes();
      const msg = `${res.updated} cotação(ões) atualizadas via CoinGecko${
        res.failed.length > 0
          ? ` · ${res.failed.length} não suportada(s): ${res.failed.join(", ")}`
          : ""
      }`;
      setRefreshResult(msg);
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  const totalValue = holdings.reduce(
    (acc, h) => acc + h.quantity * (h.currentPriceCents ?? h.avgCostCents),
    0,
  );
  const totalCost = holdings.reduce((acc, h) => acc + h.quantity * h.avgCostCents, 0);
  const profit = totalValue - totalCost;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Criptomoedas</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Bitcoin, Ethereum, stablecoins. Em exchanges ou self-custody.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {holdings.length > 0 && (
            <Button variant="secondary" size="sm" onClick={refresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Atualizar cotações
            </Button>
          )}
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Lançar saldo
          </Button>
        </div>
      </div>

      {refreshResult && (
        <div className="rounded-[var(--radius)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/60 px-3 py-2 text-xs text-[var(--color-primary)]">
          {refreshResult}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Valor de mercado" value={formatBRL(Math.round(totalValue))} tone="primary" />
        <Stat label="Custo médio total" value={formatBRL(Math.round(totalCost))} />
        <Stat
          label="Lucro / prejuízo"
          value={formatBRL(Math.round(profit))}
          tone={profit >= 0 ? "income" : "expense"}
        />
      </div>

      {holdings.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
          <Bitcoin className="mx-auto h-10 w-10 text-[var(--color-fg-subtle)]" />
          <p className="mt-3 text-sm font-medium">Nada cadastrado ainda</p>
          <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
            Lance seus saldos manualmente. Em breve, conexão direta com Binance, Mercado
            Bitcoin, Coinbase e outras via API read-only.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                <th className="px-4 py-2.5 font-medium">Moeda</th>
                <th className="px-4 py-2.5 font-medium">Local</th>
                <th className="px-4 py-2.5 text-right font-medium">Qtd</th>
                <th className="px-4 py-2.5 text-right font-medium">Preço médio</th>
                <th className="px-4 py-2.5 text-right font-medium">Cotação</th>
                <th className="px-4 py-2.5 text-right font-medium">Posição</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const market = h.quantity * (h.currentPriceCents ?? h.avgCostCents);
                return (
                  <tr key={h.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-4 py-2.5 font-medium">
                      {h.symbol}
                      <p className="text-[10px] text-[var(--color-fg-subtle)]">{h.name}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <Badge variant="default">{labelVenue(h.venue)}</Badge>
                      {h.walletAddress && (
                        <p className="mt-0.5 font-mono text-[9px] text-[var(--color-fg-subtle)]">
                          {h.walletAddress.slice(0, 8)}…{h.walletAddress.slice(-6)}
                        </p>
                      )}
                    </td>
                    <td className="num px-4 py-2.5 text-right">{h.quantity.toFixed(6)}</td>
                    <td className="num px-4 py-2.5 text-right text-xs text-[var(--color-fg-muted)]">
                      {formatBRL(h.avgCostCents)}
                    </td>
                    <td className="num px-4 py-2.5 text-right text-xs">
                      {h.currentPriceCents != null ? formatBRL(h.currentPriceCents) : "—"}
                    </td>
                    <td className="num px-4 py-2.5 text-right font-semibold">
                      {formatBRL(Math.round(market))}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={async () => {
                          if (confirm(`Apagar ${h.symbol}?`)) {
                            await deleteCryptoHolding(h.id);
                            router.refresh();
                          }
                        }}
                        aria-label="Apagar"
                        className="text-[var(--color-fg-subtle)] hover:text-[var(--color-expense)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CryptoDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function CryptoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [symbol, setSymbol] = React.useState("");
  const [name, setName] = React.useState("");
  const [venue, setVenue] = React.useState("binance");
  const [quantity, setQuantity] = React.useState("");
  const [avgCost, setAvgCost] = React.useState("");
  const [currentPrice, setCurrentPrice] = React.useState("");
  const [walletAddress, setWalletAddress] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setSymbol("");
      setName("");
      setVenue("binance");
      setQuantity("");
      setAvgCost("");
      setCurrentPrice("");
      setWalletAddress("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const q = Number(quantity.replace(",", "."));
    const ac = parseAmountToCents(avgCost);
    const cp = currentPrice ? parseAmountToCents(currentPrice) : null;
    if (!q || q <= 0 || ac == null) {
      setError("Confira os valores.");
      return;
    }
    setLoading(true);
    try {
      await createCryptoHolding({
        symbol,
        name: name || symbol,
        venue: venue as "binance",
        quantity: q,
        avgCostCents: ac,
        currentPriceCents: cp,
        walletAddress: walletAddress || null,
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
          <DialogTitle>Lançar saldo de cripto</DialogTitle>
          <DialogDescription>
            Em exchange ou self-custody (informa o endereço da carteira).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-symbol">Símbolo</Label>
              <Input
                id="c-symbol"
                required
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="BTC / ETH / SOL"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-venue">Local</Label>
              <select
                id="c-venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="binance">Binance</option>
                <option value="mercadobitcoin">Mercado Bitcoin</option>
                <option value="coinbase">Coinbase</option>
                <option value="foxbit">Foxbit</option>
                <option value="kraken">Kraken</option>
                <option value="bitso">Bitso</option>
                <option value="novadax">NovaDAX</option>
                <option value="self_custody">Self-custody (carteira própria)</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-name">Nome (opcional)</Label>
            <Input
              id="c-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bitcoin"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-qty">Quantidade</Label>
              <Input
                id="c-qty"
                inputMode="decimal"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.05"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-cost">Preço médio (R$)</Label>
              <Input
                id="c-cost"
                inputMode="decimal"
                required
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                placeholder="280.000,00"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-price">Cotação atual (opcional)</Label>
            <Input
              id="c-price"
              inputMode="decimal"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="320.000,00"
            />
          </div>
          {venue === "self_custody" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-wallet">Endereço da carteira (opcional)</Label>
              <Input
                id="c-wallet"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="bc1q..."
              />
              <p className="text-[10px] text-[var(--color-fg-subtle)]">
                Em breve, sincronização automática consultando o blockchain.
              </p>
            </div>
          )}
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
              Salvar
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

function labelVenue(v: string): string {
  return (
    {
      binance: "Binance",
      mercadobitcoin: "Mercado Bitcoin",
      coinbase: "Coinbase",
      foxbit: "Foxbit",
      kraken: "Kraken",
      bitso: "Bitso",
      novadax: "NovaDAX",
      self_custody: "Self-custody",
      other: "Outro",
    }[v] ?? v
  );
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
