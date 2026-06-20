import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Plus } from "lucide-react";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Bem-vinda" };

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");

  const u = session.user as { familyId?: string | null; role?: string };
  if (!u.familyId) {
    // Sem família — algo deu errado no signup. Mandar pro signup de novo.
    redirect("/assinar");
  }

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-[var(--color-bg-muted)] px-4 py-12">
      <div aria-hidden className="aurora -z-10" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grain" />

      <div className="reveal w-full max-w-lg" style={{ ["--d" as string]: "0ms" }}>
        <div className="inline-flex">
          <BrandMark />
        </div>
        <div className="card-hover relative isolate mt-8 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-8 shadow-soft backdrop-blur-sm">
          <p className="eyebrow">Boas-vindas · Onboarding</p>
          <h1 className="mt-3 text-balance text-3xl font-medium tracking-[-0.02em] sm:text-[2.6rem] sm:leading-[1.05]">
            Bem-vinda,{" "}
            <span className="display-serif italic font-normal">
              {session.user.name?.split(" ")[0] ?? "família"}
            </span>
            .
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-[var(--color-fg-muted)]">
            Seu trial de {BRAND.pricing.trialDays} dias começou. A partir daqui, dois caminhos:
          </p>

          <ol className="mt-6 space-y-3">
            <Step
              n={1}
              title="Conectar o grupo do WhatsApp"
              desc="A IA passa a capturar cada mensagem com gasto. É a mágica do produto."
              cta={
                <Button asChild>
                  <Link href="/app/whatsapp">
                    <MessageSquare className="h-4 w-4" /> Conectar agora
                  </Link>
                </Button>
              }
            />
            <Step
              n={2}
              title="Lançar uma transação manual"
              desc="Pra você ver o dashboard funcionando antes mesmo de pareiar o WhatsApp."
              cta={
                <Button asChild variant="secondary">
                  <Link href="/app/transacoes?new=1">
                    <Plus className="h-4 w-4" /> Lançar agora
                  </Link>
                </Button>
              }
            />
          </ol>

          <div className="mt-7 border-t border-[var(--color-border)] pt-5">
            <Link
              href="/app"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
            >
              Ir direto pro dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Step({
  n,
  title,
  desc,
  cta,
}: {
  n: number;
  title: string;
  desc: string;
  cta: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-4">
      <span className="display-serif inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-lg text-[var(--color-primary)]">
        {n}
      </span>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-[var(--color-fg-muted)]">{desc}</p>
        <div className="mt-3">{cta}</div>
      </div>
    </li>
  );
}
