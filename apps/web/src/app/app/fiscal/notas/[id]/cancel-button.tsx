"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelInvoice } from "@/lib/fiscal/invoices";

export function CancelButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function handle() {
    const reason = prompt("Motivo do cancelamento:");
    if (!reason) return;
    setLoading(true);
    try {
      const res = await cancelInvoice(invoiceId, reason);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handle}
      disabled={loading}
      className="text-[var(--color-expense)] hover:bg-[var(--color-expense-soft)]"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
      Cancelar nota
    </Button>
  );
}
