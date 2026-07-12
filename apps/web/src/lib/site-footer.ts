/**
 * Modelo e validação do rodapé do site — puro (sem acesso a DB).
 *
 * Seguro para importar tanto do client (admin) quanto do server. A leitura do
 * valor salvo fica em `site-content.ts` (getFooter), que toca o banco.
 *
 * Fonte de verdade em runtime: `platform_settings` chave `site.footer` (JSON),
 * editada em /admin/site. Fallback = DEFAULT_FOOTER (só links que funcionam).
 */

export const FOOTER_SETTING_KEY = "site.footer";

export type FooterLink = { label: string; href: string };
export type FooterColumn = { title: string; links: FooterLink[] };
export type FooterConfig = { columns: FooterColumn[] };

/** Limites — protegem UI e evitam JSON absurdo salvo por engano. */
export const FOOTER_LIMITS = {
  columns: 5,
  linksPerColumn: 12,
  title: 48,
  label: 48,
  href: 300,
} as const;

/**
 * Default garantidamente sem 404. Âncoras usam a forma "/#secao" pra funcionar
 * também a partir das páginas internas (termos, contato…), não só da home.
 */
export const DEFAULT_FOOTER: FooterConfig = {
  columns: [
    {
      title: "Produto",
      links: [
        { label: "Como funciona", href: "/#como-funciona" },
        { label: "Diferenciais", href: "/#diferenciais" },
        { label: "Preço", href: "/#precos" },
        { label: "Status", href: "/status" },
      ],
    },
    {
      title: "Empresa",
      links: [
        { label: "Blog", href: "/blog" },
        { label: "Contato", href: "/contato" },
        { label: "Imprensa", href: "/imprensa" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Termos de uso", href: "/termos" },
        { label: "Privacidade", href: "/privacidade" },
        { label: "LGPD", href: "/lgpd" },
        { label: "Cookies", href: "/cookies" },
      ],
    },
  ],
};

/**
 * Aceita: caminho interno ("/..."), âncora ("#..." ou "/#..."), mailto:, tel:,
 * e http(s). Rejeita javascript:, data: e qualquer coisa não reconhecida.
 */
export function isSafeHref(href: string): boolean {
  const h = href.trim();
  if (!h || h.length > FOOTER_LIMITS.href) return false;
  if (h.startsWith("/") || h.startsWith("#")) return true;
  if (h.startsWith("mailto:") || h.startsWith("tel:")) return h.length > (h.startsWith("tel:") ? 4 : 7);
  try {
    const u = new URL(h);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Link interno (Next Link) vs externo (<a>). */
export function isInternalHref(href: string): boolean {
  const h = href.trim();
  return h.startsWith("/") || h.startsWith("#");
}

/**
 * Saneia qualquer entrada em um FooterConfig válido. Descarta links/colunas
 * inválidos; se nada sobrar, volta pro DEFAULT_FOOTER.
 */
export function normalizeFooter(raw: unknown): FooterConfig {
  const rawCols =
    raw && typeof raw === "object" && Array.isArray((raw as { columns?: unknown }).columns)
      ? ((raw as { columns: unknown[] }).columns)
      : null;
  if (!rawCols) return DEFAULT_FOOTER;

  const columns: FooterColumn[] = [];
  for (const c of rawCols.slice(0, FOOTER_LIMITS.columns)) {
    if (!c || typeof c !== "object") continue;
    const title = String((c as { title?: unknown }).title ?? "")
      .trim()
      .slice(0, FOOTER_LIMITS.title);
    const rawLinks = Array.isArray((c as { links?: unknown }).links)
      ? ((c as { links: unknown[] }).links)
      : [];

    const links: FooterLink[] = [];
    for (const l of rawLinks.slice(0, FOOTER_LIMITS.linksPerColumn)) {
      if (!l || typeof l !== "object") continue;
      const label = String((l as { label?: unknown }).label ?? "")
        .trim()
        .slice(0, FOOTER_LIMITS.label);
      const href = String((l as { href?: unknown }).href ?? "").trim();
      if (!label || !isSafeHref(href)) continue;
      links.push({ label, href });
    }

    if (!title || links.length === 0) continue;
    columns.push({ title, links });
  }

  return columns.length > 0 ? { columns } : DEFAULT_FOOTER;
}
