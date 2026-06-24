FROM node:20-alpine AS base
RUN npm install -g pnpm@10
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/templates/package.json ./packages/templates/
COPY providers/github/package.json ./providers/github/
COPY providers/coolify/package.json ./providers/coolify/
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build
FROM deps AS builder
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/sdk ./packages/sdk
COPY packages/templates ./packages/templates
COPY providers/github ./providers/github
COPY providers/coolify ./providers/coolify
COPY apps/api ./apps/api
RUN pnpm --filter @hallo/api exec prisma generate
RUN pnpm --filter @hallo/api... build

# Runner
FROM node:20-alpine AS runner
RUN npm install -g pnpm@10
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/templates/package.json ./packages/templates/
COPY providers/github/package.json ./providers/github/
COPY providers/coolify/package.json ./providers/coolify/

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=builder /app/packages/templates/dist ./packages/templates/dist
COPY --from=builder /app/providers/github/dist ./providers/github/dist
COPY --from=builder /app/providers/coolify/dist ./providers/coolify/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm --filter @hallo/api exec prisma generate

WORKDIR /app/apps/api

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/apps/api/src/main"]
