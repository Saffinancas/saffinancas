import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cofre/db", "@cofre/ai"],
  // PGlite tem WASM e usa fs.readFile com URL — não pode ser bundlado pelo
  // webpack do Next (quebra no Node 24 com ERR_INVALID_ARG_TYPE).
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // Reforço: força externals via webpack mesmo quando a dep vem transitiva
  // de um pacote em transpilePackages.
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = config.externals as
        | Array<string | ((ctx: unknown, cb: unknown) => unknown)>
        | undefined;
      if (Array.isArray(externals)) {
        externals.push("@electric-sql/pglite", "postgres");
      }
    }
    return config;
  },
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
