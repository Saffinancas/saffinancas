"use server";

/**
 * Conteúdo público editável do site (via /admin/site) — hoje: rodapé.
 *
 * Lê de `platform_settings` (chave `site.footer`, JSON). Fallback pro
 * DEFAULT_FOOTER quando não setado ou inválido. Ver [site-footer.ts] para
 * o modelo/validação puros.
 */
import { getPlatformSetting } from "@/lib/platform-settings";
import {
  FOOTER_SETTING_KEY,
  DEFAULT_FOOTER,
  normalizeFooter,
  type FooterConfig,
} from "@/lib/site-footer";

export async function getFooter(): Promise<FooterConfig> {
  const raw = await getPlatformSetting(FOOTER_SETTING_KEY);
  if (!raw) return DEFAULT_FOOTER;
  try {
    return normalizeFooter(JSON.parse(raw));
  } catch {
    return DEFAULT_FOOTER;
  }
}
