import { BRAND } from "@/lib/brand";

export const metadata = { title: "Política de Cookies" };

export default function CookiesPage() {
  return (
    <>
      <h1>Política de Cookies</h1>
      <p>
        O {BRAND.name} usa um número mínimo de cookies. Lista completa abaixo.
      </p>

      <h2>Cookies estritamente necessários</h2>
      <ul>
        <li>
          <code>saf.session_token</code> — token de sessão HttpOnly. Sem isso, login não
          funciona. Validade: 30 dias.
        </li>
        <li>
          <code>saf.session_data</code> — cache de dados do usuário (cookie de aplicação).
        </li>
        <li>
          <code>theme</code> — preferência de tema claro/escuro. Local apenas.
        </li>
      </ul>

      <h2>Cookies que NÃO usamos</h2>
      <ul>
        <li>Cookies de publicidade ou de terceiros.</li>
        <li>Pixel de tracking de redes sociais.</li>
        <li>Cookies de retargeting.</li>
      </ul>

      <h2>Analytics</h2>
      <p>
        Usamos PostHog (quando configurado) para entender comportamento agregado de uso —
        com IP anonimizado e sem fingerprinting. Você pode desativar em PostHog Settings.
      </p>
    </>
  );
}
