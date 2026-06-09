"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setPlatformSetting } from "@/lib/platform-settings";

async function requireAdmin(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") throw new Error("Sem permissão.");
  return session.user.id;
}

export type UpdatePricingInput = {
  /** Mensalidade em centavos. */
  monthlyCents: number;
  /** Desconto percentual sobre 12× mensal (0-95). */
  annualDiscountPct: number;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updatePricingAction(input: UpdatePricingInput): Promise<ActionResult> {
  try {
    const userId = await requireAdmin();

    const monthly = Math.round(Number(input.monthlyCents));
    const discount = Math.round(Number(input.annualDiscountPct));

    if (!Number.isFinite(monthly) || monthly < 100) {
      return { ok: false, error: "Mensalidade inválida — mínimo R$ 1,00." };
    }
    if (monthly > 1_000_000) {
      return { ok: false, error: "Mensalidade absurda — máximo R$ 10.000,00." };
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > 95) {
      return { ok: false, error: "Desconto deve ficar entre 0% e 95%." };
    }

    await Promise.all([
      setPlatformSetting("pricing.monthly_cents", String(monthly), {
        encrypted: false,
        updatedByUserId: userId,
      }),
      setPlatformSetting("pricing.annual_discount_pct", String(discount), {
        encrypted: false,
        updatedByUserId: userId,
      }),
    ]);

    revalidatePath("/admin/cobranca/precos");
    revalidatePath("/admin/cobranca");
    revalidatePath("/");
    revalidatePath("/assinar");
    revalidatePath("/app/cobranca");
    revalidatePath("/admin");

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro inesperado." };
  }
}
