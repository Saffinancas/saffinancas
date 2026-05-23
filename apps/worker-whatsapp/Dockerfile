# =============================================================================
# Worker WhatsApp — Dockerfile multi-stage para Fly.io
#
# Base: Node 22 Bullseye (Debian). Precisa de Chromium + libs do Puppeteer
# pq whatsapp-web.js usa um Chrome headless pra "ser o WhatsApp Web".
# =============================================================================

FROM node:22-bookworm-slim AS base

# --- Dependências do sistema pro Chromium ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
    wget \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# --- pnpm via corepack ---
RUN corepack enable && corepack prepare pnpm@11.0.9 --activate

WORKDIR /app

# --- Stage 1: instalar deps do monorepo ---
FROM base AS deps

# Copia manifestos do monorepo + workspaces dependentes do worker.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY apps/worker-whatsapp/package.json apps/worker-whatsapp/
COPY packages/db/package.json packages/db/
COPY packages/ai/package.json packages/ai/

RUN pnpm install --frozen-lockfile

# --- Stage 2: copiar código-fonte ---
FROM base AS runtime

WORKDIR /app

# node_modules do monorepo (root + de cada workspace)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker-whatsapp/node_modules ./apps/worker-whatsapp/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/ai/node_modules ./packages/ai/node_modules

# Manifestos
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/worker-whatsapp/package.json apps/worker-whatsapp/tsconfig.json apps/worker-whatsapp/
COPY packages/db/package.json packages/db/tsconfig.json packages/db/
COPY packages/ai/package.json packages/ai/tsconfig.json packages/ai/

# Código-fonte
COPY apps/worker-whatsapp/src ./apps/worker-whatsapp/src
COPY packages/db/src ./packages/db/src
COPY packages/ai/src ./packages/ai/src

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

WORKDIR /app/apps/worker-whatsapp
CMD ["pnpm", "start"]
