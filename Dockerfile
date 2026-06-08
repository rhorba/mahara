# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable

WORKDIR /repo

# Install deps first (cached layer unless lock file changes)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json                     apps/web/package.json
COPY packages/core/package.json                packages/core/package.json
COPY packages/db/package.json                  packages/db/package.json
COPY packages/matching/package.json            packages/matching/package.json
COPY packages/payments/package.json            packages/payments/package.json
COPY packages/notifications/package.json       packages/notifications/package.json
COPY packages/verification/package.json        packages/verification/package.json

RUN pnpm install --frozen-lockfile

# Copy full source and build
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT=standalone

RUN pnpm --filter web build

# ── Stage 2: runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Copy standalone server + static assets
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public           ./apps/web/public

USER node

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
