import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { auth } from "@/lib/auth";
import { getFooter } from "@/lib/site-content";
import { FooterEditor } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminSitePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");
  if ((session.user as { role?: string }).role !== "admin") redirect("/admin");

  const footer = await getFooter();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Conteúdo do site · Rodapé"
        title={
          <>
            Colunas e <span className="display-serif italic">links do rodapé</span>
          </>
        }
        description="Edite os links do rodapé de todo o site. Aceita caminhos internos (/termos), âncoras (/#precos), e-mail (mailto:) e links externos (https://). A mudança entra no ar em toda a landing e páginas públicas."
        tone="primary"
      />

      <FooterEditor initial={footer} />
    </div>
  );
}
