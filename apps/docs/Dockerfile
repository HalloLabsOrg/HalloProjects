FROM node:20-alpine AS base
RUN npm install -g pnpm@10
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/docs/package.json ./apps/docs/
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build static site
FROM deps AS builder
COPY tsconfig.base.json ./
COPY apps/docs ./apps/docs
RUN pnpm --filter apps-docs run build

# Production server - serve static files using Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/docs/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
