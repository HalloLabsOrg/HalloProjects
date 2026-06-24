---
id: roadmap
title: Roadmap & Checklist
sidebar_position: 14
---

# Roadmap & Build Checklist

> Legend: `[ ]` belum dikerjakan · `[x]` selesai · `[~]` in progress

---

## v0.1 Alpha — Foundation

**Goal:** Sistem bisa login, connect ke GitHub & Coolify, buat project, dan trigger deploy manual.

### 📦 Monorepo & Infrastructure Setup

- [x] Init monorepo dengan `pnpm workspaces` + Turborepo
- [x] Setup `apps/web` — Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [x] Setup `apps/api` — NestJS + TypeScript + Prisma
- [x] Setup `apps/worker` — NestJS standalone + BullMQ
- [x] Setup `packages/shared`, `packages/sdk`, `packages/ui`
- [x] Setup `docker-compose.yml` production + `docker-compose.dev.yml`
- [x] Setup Caddyfile dengan reverse proxy config
- [x] Setup `turbo.json` pipeline
- [x] Setup ESLint + Prettier shared config
- [x] Setup `.env.example`
- [x] Setup GitHub Actions CI — lint + test + build

### 🗄️ Database

- [x] Tulis Prisma schema lengkap
- [x] Buat migration awal
- [x] Buat `PrismaService`
- [x] Buat seed script untuk admin user
- [x] Setup database encryption utility (AES-256-GCM)

### 🔐 Auth Module

- [x] `POST /auth/login`
- [x] `GET /auth/me`
- [x] `POST /auth/change-password`
- [x] `JwtAuthGuard`, `RolesGuard`, `@Roles()`, `@CurrentUser()`
- [x] Global exception filter untuk error response konsisten

### 👥 Users Module

- [x] `GET /users`, `POST /users`, `GET /users/:id`
- [x] `PATCH /users/:id`, `PATCH /users/:id/disable`, `DELETE /users/:id`

### 🔌 Providers Module

- [x] CRUD provider connections
- [x] `POST /providers/:id/test`
- [x] Enkripsi credentials + masking di response

### 🐙 GitHub Provider

- [x] `listRepositories()`, `getRepository()`, `getBranches()`, `getCommit()`
- [x] `registerWebhook()`, `validateWebhookSignature()`
- [x] `ProviderFactory`

### 🚀 Coolify Provider

- [x] `listApplications()`, `deploy()`, `getStatus()`, `getLogs()`, `rollback()`

### 📁 Repositories Module

- [x] `GET /repositories`, `GET /repositories/:id`
- [x] `GET /repositories/:id/branches`
- [x] `POST /repositories/sync`
- [x] Background job: `sync-repository`

### 📂 Projects Module

- [x] `POST /projects`, `GET /projects`, `GET /projects/:id`
- [x] `PATCH /projects/:id`, `POST /projects/:id/archive`, `DELETE /projects/:id`
- [x] Auto-generate slug dari name

### ⚙️ Services Module

- [x] CRUD services under project
- [x] Auto-create 3 default environments saat project dibuat

### 🌍 Environments Module

- [x] CRUD environments
- [x] CRUD environment variables (dengan enkripsi)

### 🚢 Deployments Module

- [x] `POST /services/:serviceId/deploy`
- [x] `GET /deployments`, `GET /deployments/:id`
- [x] `POST /deployments/:id/cancel`
- [x] Background job: `deploy-service` processor
- [x] Status polling loop di worker

### 📋 Audit Logs Module

- [x] `AuditLogService` + inject ke semua modules
- [x] `GET /audit-logs` dengan filter

### 🖥️ Frontend

- [x] Layout: sidebar + top nav + content area
- [x] Halaman Login
- [x] TanStack Query + Axios client + JWT interceptor
- [x] Zustand auth store
- [x] Dashboard, Projects, Repositories, Deployments pages
- [x] Providers, Users, Audit Logs pages
- [x] Empty states + Error states untuk semua halaman

### ✅ v0.1 DoD

- [x] User bisa login dan logout
- [x] Admin bisa connect GitHub dan Coolify
- [x] User bisa sync repositories
- [x] User bisa create project dengan services
- [x] User bisa trigger manual deploy
- [x] Deployment status terupdate
- [x] Semua actions terekam di audit log
- [x] Bisa diinstall via `docker compose up -d`

---

## v0.2 — Automation

**Goal:** Deploy otomatis saat push ke branch.

### 🔗 Webhooks Module

- [ ] `POST /webhooks/github` dengan signature validation
- [ ] Push job ke queue `webhooks`
- [ ] Background job: `process-github-webhook`
- [ ] Auto-register webhook ke GitHub saat provider dibuat

### 🤖 Auto Deploy Logic

- [ ] Field `autoDeploy` + `branch` di Environment
- [ ] Logic: webhook → cek branch match → trigger deploy
- [ ] Frontend: toggle auto-deploy per environment

### 📜 Deployment History & Logs

- [ ] Simpan raw logs dari Coolify ke `Deployment.logs`
- [ ] SSE log streaming: `GET /deployments/:id/logs/stream`
- [ ] Frontend: live log viewer dengan auto-scroll
- [ ] Frontend: deployment history timeline

### ❌ Cancel Deployment

- [x] `POST /deployments/:id/cancel`
- [x] Frontend: tombol Cancel saat deployment berjalan

### ✅ v0.2 DoD

- [ ] Push ke branch trigger auto-deploy
- [ ] Webhook diproses dalam < 5 detik
- [ ] Logs bisa dilihat real-time
- [ ] User bisa cancel deployment

---

## v0.3 — Observability

**Goal:** Health monitoring, environment variables, domain tracking.

### 💊 Monitoring Module

- [ ] `GET /monitoring`, `GET /monitoring/:serviceId`, `GET /monitoring/:serviceId/history`
- [ ] Background job: `check-service-health` (repeatable 60s)
- [ ] Status mapping: ONLINE / SLOW / OFFLINE
- [ ] Data retention cleanup (30 hari)

### 🌐 Domain & Health Check URL

- [ ] Field `domain` + `healthCheckUrl` di Environment
- [ ] Migration untuk fields baru
- [ ] Frontend: form edit environment

### 🔑 Environment Variables

- [x] List, create, update, delete variables
- [x] Enkripsi + masking untuk secret variables
- [ ] Reveal secret endpoint (dengan audit log)
- [ ] Bulk import/export via `.env` format

### 📊 Dashboard Improvements

- [ ] Stats cards: total projects, active deploys, offline services
- [ ] Recent activity feed
- [ ] Services status grid
- [ ] Quick actions

### ✅ v0.3 DoD

- [ ] Services di-check setiap 60 detik
- [ ] Dashboard menampilkan service offline
- [ ] Environment variables dikelola dengan enkripsi
- [ ] Uptime history 7 hari tersedia

---

## v0.4 — Template Engine

**Goal:** Upload, apply, dan manage project templates.

### 🧩 Templates Module

- [ ] CRUD templates
- [ ] Upload + parse `.zip` (validasi struktur, extract schema)
- [ ] Simpan file tree ke database
- [ ] Versioning

### 🔧 Template Engine

- [ ] Variable substitution: `{{ variable_name }}`
- [ ] Conditional blocks: `{% if condition %}...{% endif %}`
- [ ] Default values dari schema
- [ ] Dry-run / preview endpoint

### 📋 Apply Template

- [ ] Render files dengan form values
- [ ] Save generated environment variables ke database
- [ ] Frontend: stepper wizard — pilih → isi form → preview → apply

### 📚 Built-in Templates

- [ ] `nodejs-postgres` — Node.js + PostgreSQL
- [ ] `nextjs-static` — Next.js static
- [ ] `fullstack-monorepo` — Next.js + NestJS + PostgreSQL
- [ ] `worker-service` — Background job service

### ✅ v0.4 DoD

- [ ] Admin bisa upload template via `.zip`
- [ ] User bisa browse dan apply template
- [ ] Minimal 3 built-in templates tersedia

---

## v1.0 — Community Release

**Goal:** Platform siap publik — Docker images, installer, dokumentasi lengkap.

### 🐳 Docker & Release

- [ ] Build + publish Docker images ke GitHub Container Registry
- [ ] GitHub Actions: auto-build on release tag
- [ ] Multi-stage build untuk optimasi image size
- [ ] `GET /health` di semua services

### 🛠️ Installer

- [ ] Finalisasi `docker-compose.yml` production
- [ ] `install.sh` — one-liner installer
  - Check prerequisites
  - Generate secrets otomatis
  - `docker compose up -d`
  - Run migrations
  - Print URL + kredensial admin
- [ ] `update.sh` — script update
- [ ] Test di Ubuntu 22.04, Ubuntu 24.04, Debian 12

### 📖 Documentation

- [ ] Finalisasi Docusaurus docs site ini
- [ ] `README.md` root repo dengan quick start + screenshots
- [ ] Docs: installation, configuration, providers, templates, contributing
- [ ] Deploy docs ke GitHub Pages

### 🧪 Testing

- [ ] Unit tests semua NestJS services (target > 70% coverage)
- [ ] Integration tests semua API endpoints
- [ ] E2E test: install → login → connect → deploy
- [ ] Security audit: dependency vulnerabilities, OWASP

### 🌍 Community

- [ ] `CONTRIBUTING.md` dengan code of conduct
- [ ] GitHub Discussions
- [ ] Issue templates: bug report, feature request
- [ ] Publish dengan lisensi MIT

### ✅ v1.0 DoD

- [ ] Instalasi di fresh Ubuntu VPS dalam < 10 menit
- [ ] GitHub + Coolify integration end-to-end
- [ ] Auto-deploy bekerja
- [ ] Monitoring bekerja
- [ ] Template engine dengan 3+ built-in templates
- [ ] Dokumentasi lengkap
- [ ] Docker images tersedia
- [ ] Zero critical security vulnerabilities

---

## Summary

| Version | Focus | Est. Tasks |
|---|---|---|
| v0.1 Alpha | Foundation: Auth, GitHub, Coolify, Projects, Deploy | ~65 tasks |
| v0.2 | Automation: Webhooks, Auto-deploy, Live logs | ~25 tasks |
| v0.3 | Observability: Monitoring, Env vars, Domains | ~25 tasks |
| v0.4 | Template Engine | ~25 tasks |
| v1.0 | Community Release: Docker, Docs, Installer, Tests | ~30 tasks |
