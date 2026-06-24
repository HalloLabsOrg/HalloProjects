FROM node:20-alpine AS base
RUN npm install -g pnpm@10
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
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
COPY apps/api ./apps/api
RUN pnpm --filter @hallo/api exec prisma generate
RUN pnpm --filter @hallo/api run build

# Runner
FROM node:20-alpine AS runner
RUN npm install -g pnpm@10
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/sdk/package.json ./packages/sdk/
COPY providers/github/package.json ./providers/github/
COPY providers/coolify/package.json ./providers/coolify/

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm --filter @hallo/api exec prisma generate

WORKDIR /app/apps/api

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/apps/api/src/main"]
