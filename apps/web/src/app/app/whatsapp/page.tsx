import { getSessionView } from "@/lib/whatsapp";
import { WhatsappClient } from "./client";

export const dynamic = "force-dynamic";

export default async function WhatsappPage() {
  const session = await getSessionView();
  return <WhatsappClient initial={session} />;
}
