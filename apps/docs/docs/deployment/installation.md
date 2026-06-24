---
id: installation
title: Installation
---

# Installation

## Requirements

| Spesifikasi    | Minimum                    | Recommended  |
| -------------- | -------------------------- | ------------ |
| OS             | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 |
| CPU            | 2 vCPU                     | 4 vCPU       |
| RAM            | 2 GB                       | 8 GB         |
| Storage        | 30 GB SSD                  | 80 GB SSD    |
| Docker         | 24+                        | latest       |
| Docker Compose | Plugin v2+                 | latest       |

## Install via Docker Compose

```bash
# 1. Clone repository
git clone https://github.com/hallolabs/hallo-projects.git
cd hallo-projects

# 2. Copy environment file
cp .env.example .env

# 3. Edit konfigurasi (domain, secrets, database password)
nano .env

# 4. Jalankan semua services
docker compose up -d

# 5. Jalankan database migrations
docker compose exec api npx prisma migrate deploy

# 6. Buat admin user pertama
docker compose exec api npm run seed:admin
```

Setelah selesai, buka `https://your-domain` di browser.

## Verifikasi Instalasi

```bash
# Cek semua services berjalan
docker compose ps

# Cek logs jika ada masalah
docker compose logs api
docker compose logs worker
```

## Update ke Versi Terbaru

```bash
# Pull images terbaru
docker compose pull

# Restart services
docker compose up -d

# Jalankan migration baru jika ada
docker compose exec api npx prisma migrate deploy
```

:::tip Installer Script
One-line installer akan tersedia di v1.0:

```bash
curl -fsSL https://get.halloprojects.io | bash
```

:::
