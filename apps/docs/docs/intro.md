---
id: intro
title: Overview
sidebar_position: 1
slug: /
---

# HALLO Projects

**One Dashboard for Every Project**

HALLO Projects adalah **Project Control Plane** open-source yang self-hosted. Tujuannya bukan menggantikan GitHub atau Coolify — melainkan menjadi **lapisan kontrol** yang menyatukan seluruh aktivitas project dari repository hingga production dalam satu dashboard.

## Problem

Developer dan tim saat ini harus berpindah-pindah antara:

- **GitHub** — source code & repository
- **Coolify** — deployment & server management
- **Cloudflare** — DNS & proxy
- **VPS** — monitoring & logs

HALLO Projects menghilangkan friction tersebut.

## Core Philosophy

| Prinsip                     | Penjelasan                                                    |
| --------------------------- | ------------------------------------------------------------- |
| **Repository First**        | Repository adalah sumber kebenaran utama untuk semua entitas  |
| **Provider Agnostic**       | Provider dapat diganti tanpa mengubah inti sistem             |
| **Self Hosted First**       | Semua data berada di server milik pengguna                    |
| **Community Maintainable**  | Struktur kode harus mudah dipahami kontributor baru           |
| **Configuration Over Code** | Konfigurasi dilakukan melalui UI dan template, bukan hardcode |

## Community Edition Scope

**Included:**

- Self-hosted installation via Docker Compose
- User management (Admin, Developer, Viewer)
- GitHub integration (PAT)
- Coolify integration (API Token)
- Repository registry & sync
- Project & service registry
- Deployment management (manual + auto)
- Environment management + variables
- HTTP health monitoring
- Audit logs
- Dynamic template engine

**Not Included (Enterprise/Future):**

- AI Agents
- SaaS hosted version
- GitLab, Gitea, Bitbucket
- Kubernetes
- Multi-organization / SSO / LDAP

## Quick Start

```bash
git clone https://github.com/hallolabs/hallo-projects.git
cd hallo-projects
cp .env.example .env
# Edit .env dengan konfigurasi Anda
docker compose up -d
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run seed:admin
```

Setelah instalasi, buka `https://your-domain` dan login dengan akun admin yang dibuat saat seed.

## Target Users

- **Individual Developer** — mengelola beberapa aplikasi pribadi
- **Startup Team** — mengelola produk dan deployment
- **Software House** — mengelola banyak project klien
- **Research Lab** — mengelola aplikasi penelitian
- **Campus IT Team** — mengelola berbagai aplikasi internal
