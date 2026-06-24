---
id: docker-compose
title: Docker Compose Reference
---

# Docker Compose Reference

## `docker-compose.yml`

```yaml
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web
      - api

  web:
    image: hallolabs/hallo-projects-web:latest
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
    depends_on:
      - api

  api:
    image: hallolabs/hallo-projects-api:latest
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://hallo:${DB_PASSWORD}@postgres:5432/hallo_projects
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    image: hallolabs/hallo-projects-worker:latest
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://hallo:${DB_PASSWORD}@postgres:5432/hallo_projects
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=hallo_projects
      - POSTGRES_USER=hallo
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hallo"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  caddy_data:
  caddy_config:
  postgres_data:
  redis_data:
```

## `Caddyfile`

```caddyfile
{$DOMAIN} {
  reverse_proxy /api/* api:4000
  reverse_proxy * web:3000

  encode gzip

  log {
    output file /var/log/caddy/access.log
  }
}
```

## Development Override

```yaml
# docker-compose.dev.yml
# Jalankan dengan: docker compose -f docker-compose.dev.yml up -d
services:
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=hallo_projects
      - POSTGRES_USER=hallo
      - POSTGRES_PASSWORD=devpassword

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```
