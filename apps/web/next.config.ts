import type { NextConfig } from "next";

/**
 * Security headers aplicados em toda resposta.
 *
 * NOTA sobre CSP: Next 16 ainda usa `unsafe-inline` no bundle inicial
 * do App Router (RSC hydration). Uma CSP com nonce por request exige
 * middleware por rota, o que quebra `revalidatePath`/streaming em
 * várias rotas — decisão: manter CSP mais frouxa em style/script mas
 * bloquear frame/object e limitar connect-src a origens conhecidas.
 * O DANFE já é XSS-safe via escapeHtml() em `lib/fiscal/danfe.ts` (esta
 * CSP é defesa em profundidade, não a primeira linha).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel-analytics.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.resend.com https://api.pagar.me https://api.pluggy.ai https://*.pluggy.ai https://api.twilio.com https://saf-whatsapp.fly.dev https://*.vercel-analytics.com https://vercel.live wss://vercel.live",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cofre/db", "@cofre/ai"],
  // PGlite tem WASM e usa fs.readFile com URL — Turbopack/webpack precisam
  // tratar como external no server. Pra Next 16 (Turbopack default),
  // serverExternalPackages é suficiente.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
