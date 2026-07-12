/**
 * Escapa HTML pra impedir XSS em templates que geram HTML manualmente
 * (ex.: DANFE). Cobre os 5 caracteres significativos da spec:
 *   & → &amp;   < → &lt;   > → &gt;   " → &quot;   ' → &#39;
 *
 * Uso: qualquer valor vindo do usuário (nome, descrição, endereço, e-mail)
 * DEVE passar por aqui antes de virar HTML.
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  const s = String(input);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
