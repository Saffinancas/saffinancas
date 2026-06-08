import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { auth } from "@/lib/auth";
import { getSafStatus } from "@/lib/saf-whatsapp";
import { SafSessionClient } from "./client";

export const dynamic = "force-dynamic";

export default async function SafSessionPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") redirect("/admin");

  const initial = await getSafStatus();

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/admin/integracoes/whatsapp">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <PageHeader
        eyebrow="Integração · WhatsApp"
        title={
          <>
            Sessão <span className="display-serif italic">Saf global</span>
          </>
        }
        description="1 número operacional Saf entra em todos os grupos das famílias. Pareamento único, sem QR — usa código de 8 dígitos digitado direto no app."
        tone="income"
      />

      <SafSessionClient initial={initial} />
    </div>
  );
}
