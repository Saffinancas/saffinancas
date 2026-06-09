import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { auth } from "@/lib/auth";
import { getPricing } from "@/lib/pricing";
import { PricingClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");
  if ((session.user as { role?: string }).role !== "admin") redirect("/admin");

  const pricing = await getPricing();

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/admin/cobranca">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <PageHeader
        eyebrow="Cobrança · Preços"
        title={
          <>
            Mensalidade e <span className="display-serif italic">desconto anual</span>
          </>
        }
        description="Mudança entra em vigor imediatamente para novas assinaturas. Quem já tem plano ativo continua no valor anterior até a próxima renovação."
        tone="primary"
      />

      <PricingClient
        initial={{
          monthlyCents: pricing.monthlyCents,
          annualDiscountPct: pricing.annualDiscountPct,
        }}
      />
    </div>
  );
}
