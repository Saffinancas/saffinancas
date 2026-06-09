import { getSessionView, generateLinkCode } from "@/lib/whatsapp";
import { getActiveProviderId } from "@/lib/whatsapp-providers";
import { WhatsappClient } from "./client";

export const dynamic = "force-dynamic";

export default async function WhatsappPage() {
  let session = await getSessionView();
  const providerId = await getActiveProviderId();

  // Pra providers que usam linkCode (sem QR), se não tem código OU se está
  // expirado, gera um novo automaticamente — usuário nunca vê código vencido.
  const isLinkCodeFlow =
    providerId === "twilio_sandbox" ||
    providerId === "twilio_production" ||
    providerId === "meta_cloud" ||
    providerId === "web_js";
  const noLink = !session.linkCode;
  const expired =
    !!session.linkCodeExpiresAt && new Date(session.linkCodeExpiresAt) < new Date();
  const notLinkedYet = !session.monitoredGroupId;
  if (isLinkCodeFlow && notLinkedYet && (noLink || expired)) {
    session = await generateLinkCode();
  }

  return <WhatsappClient initial={session} />;
}
