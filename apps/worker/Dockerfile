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
RUN pnpm install --frozen-lockfile --ignore-scripts

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
COPY apps/api/package.json ./apps/api/package.json
# Generate Prisma Client so @prisma/client exports enums (e.g. DeploymentStatus).
# DATABASE_URL only needs to validate the schema format; a dummy value is fine for generate.
RUN cd apps/api && DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma@5.22.0 generate
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

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

# Copy prisma schema and package configuration to generate prisma client
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm --filter @hallo/api exec prisma generate

WORKDIR /app/apps/worker

ENV NODE_ENV=production

CMD ["node", "dist/apps/worker/src/main"]
