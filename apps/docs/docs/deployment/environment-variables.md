---
id: environment-variables
title: Environment Variables
---

# Environment Variables

## API (`apps/api`)

| Variable | Required | Default | Description |
|---|:---:|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | ✅ | — | Redis connection string |
| `JWT_SECRET` | ✅ | — | Secret untuk signing JWT (min 32 chars) |
| `JWT_EXPIRES_IN` | — | `24h` | JWT expiration |
| `ENCRYPTION_KEY` | ✅ | — | Key enkripsi credentials (32 bytes hex) |
| `PORT` | — | `4000` | Port API |
| `GITHUB_WEBHOOK_SECRET` | — | — | Secret validasi GitHub webhooks |
| `LOG_LEVEL` | — | `info` | `info` \| `debug` \| `error` \| `warn` |
| `SWAGGER_ENABLED` | — | `false` | Aktifkan Swagger UI |

## Web (`apps/web`)

| Variable | Required | Default | Description |
|---|:---:|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | — | Base URL API, e.g. `https://domain.com/api` |

## Worker (`apps/worker`)

| Variable | Required | Default | Description |
|---|:---:|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | ✅ | — | Redis connection string |
| `HEALTH_CHECK_INTERVAL` | — | `60` | Interval health check (detik) |
| `HEALTH_CHECK_TIMEOUT` | — | `10` | Timeout per request (detik) |
| `DEPLOYMENT_POLL_INTERVAL` | — | `5` | Interval polling status deploy (detik) |

## `.env.example`

```bash
# Domain
DOMAIN=projects.example.com

# Database
DB_PASSWORD=changeme_strong_password

# API Secrets
JWT_SECRET=changeme_generate_random_32_chars
ENCRYPTION_KEY=changeme_generate_random_32_byte_hex
GITHUB_WEBHOOK_SECRET=changeme_random_string

# (Diisi otomatis oleh docker compose dari variabel di atas)
# DATABASE_URL=postgresql://hallo:${DB_PASSWORD}@postgres:5432/hallo_projects
# REDIS_URL=redis://redis:6379
# NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
```

## Generate Secrets

```bash
# Generate JWT_SECRET (32 chars)
openssl rand -base64 32

# Generate ENCRYPTION_KEY (32 bytes hex)
openssl rand -hex 32

# Generate GITHUB_WEBHOOK_SECRET
openssl rand -base64 24
```
