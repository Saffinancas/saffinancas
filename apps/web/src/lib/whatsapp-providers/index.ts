/**
 * Factory de providers. Lê o provider ativo do platform_settings e retorna
 * a implementação correta.
 */
import { getPlatformSetting } from "@/lib/platform-settings";
import type { WhatsappProvider, WhatsappProviderId } from "./types";
import { simProvider } from "./providers/sim";
import { webJsProvider } from "./providers/web-js";
import { twilioSandboxProvider, twilioProductionProvider } from "./providers/twilio";
import { metaCloudProvider } from "./providers/meta-cloud";

const ALL_PROVIDERS: Record<WhatsappProviderId, WhatsappProvider> = {
  sim: simProvider,
  web_js: webJsProvider,
  twilio_sandbox: twilioSandboxProvider,
  twilio_production: twilioProductionProvider,
  meta_cloud: metaCloudProvider,
};

export const PROVIDER_LABELS: Record<WhatsappProviderId, string> = {
  sim: "Simulado (dev only)",
  web_js: "WhatsApp Web (whatsapp-web.js)",
  twilio_sandbox: "Twilio Sandbox (DM 1:1)",
  twilio_production: "Twilio Produção",
  meta_cloud: "Meta WhatsApp Cloud API",
};

const VALID_IDS = new Set(Object.keys(ALL_PROVIDERS)) as Set<WhatsappProviderId>;

export async function getActiveProviderId(): Promise<WhatsappProviderId> {
  const raw =
    (await getPlatformSetting("whatsapp.provider")) ??
    process.env.WHATSAPP_MODE ?? // compat com env var antiga (sim/real)
    "sim";
  // Compat: "real" antiga = "web_js"
  if (raw === "real") return "web_js";
  if ((VALID_IDS as Set<string>).has(raw)) return raw as WhatsappProviderId;
  return "sim";
}

export async function getActiveProvider(): Promise<WhatsappProvider> {
  const id = await getActiveProviderId();
  return ALL_PROVIDERS[id];
}

export function getProviderById(id: WhatsappProviderId): WhatsappProvider {
  return ALL_PROVIDERS[id];
}

export { type WhatsappProvider, type WhatsappProviderId } from "./types";
