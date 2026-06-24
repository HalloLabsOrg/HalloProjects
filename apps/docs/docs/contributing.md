---
id: contributing
title: Contributing
sidebar_position: 13
---

# Contributing Guide

Terima kasih sudah tertarik berkontribusi ke HALLO Projects!

## Prerequisites

```bash
node --version   # 20+
pnpm --version   # 8+
docker --version # 24+
```

## Local Development Setup

```bash
# Clone & install dependencies
git clone https://github.com/hallolabs/hallo-projects.git
cd hallo-projects
pnpm install

# Start infrastructure (postgres + redis only)
docker compose -f docker-compose.dev.yml up -d

# Copy dan isi env
cp .env.example .env

# Generate Prisma client + run migrations
pnpm --filter api prisma generate
pnpm --filter api prisma migrate dev

# Seed data awal
pnpm --filter api run seed

# Start semua apps (development mode)
pnpm dev
```

Setelah setup:

| Service | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| Swagger | http://localhost:4000/docs |

## Development Workflow

```bash
# Buat feature branch
git checkout -b feat/nama-feature

# Jalankan tests
pnpm test

# Lint
pnpm lint

# Build check
pnpm build
```

## Commit Convention

Menggunakan [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(projects): add archive project feature
fix(deployments): handle timeout error from Coolify
docs: update provider setup guide
chore: upgrade prisma to 5.8
refactor(auth): simplify JWT strategy
test(users): add unit tests for UsersService
```

## Adding a New Provider

1. Buat folder `providers/your-provider/`
2. Implement interface dari `packages/sdk`:
   - `RepositoryProvider` untuk source code provider
   - `DeploymentProvider` untuk deployment provider
3. Register di `ProviderFactory` di `apps/api`
4. Tambah nilai baru di `ProviderType` enum di Prisma schema
5. Buat migration: `pnpm --filter api prisma migrate dev`
6. Tambah docs di `apps/docs/docs/providers/`
7. Buat PR dengan deskripsi lengkap

## Adding a New Module

1. Generate module: `nest generate module modules/nama-module`
2. Ikuti struktur standar: controller, service, DTOs, types
3. Register di `AppModule`
4. Tulis unit tests untuk service
5. Tambah dokumentasi di `apps/docs/docs/modules/`

## Pull Request Guidelines

- Satu PR = satu fitur/fix
- Sertakan deskripsi yang jelas
- Tests harus pass
- Dokumentasi diupdate jika relevan
- Screenshots untuk perubahan UI
