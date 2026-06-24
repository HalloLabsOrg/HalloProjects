FROM node:20-alpine AS base
RUN npm install -g pnpm@10
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/sdk/package.json ./packages/sdk/
COPY providers/github/package.json ./providers/github/
COPY providers/coolify/package.json ./providers/coolify/
RUN pnpm install --frozen-lockfile

# Build
FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/sdk ./packages/sdk
COPY providers/github ./providers/github
COPY providers/coolify ./providers/coolify
COPY apps/worker ./apps/worker
# Copy prisma schema for client generation
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm --filter @hallo/worker run build

# Runner
FROM node:20-alpine AS runner
RUN npm install -g pnpm@10
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/shared/package.json ./packages/shared/
COPY packages/sdk/package.json ./packages/sdk/
COPY providers/github/package.json ./providers/github/
COPY providers/coolify/package.json ./providers/coolify/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

WORKDIR /app/apps/worker

ENV NODE_ENV=production

CMD ["node", "dist/apps/worker/src/main"]
