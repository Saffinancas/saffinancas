import type { NextConfig } from "next";

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
};

export default nextConfig;
