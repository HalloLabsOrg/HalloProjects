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

## Automated Installation (Recommended)

Kami menyediakan script installer otomatis untuk memasang HALLO Projects di server Ubuntu / Debian secara cepat:

```bash
# 1. Unduh installer
curl -fsSL -o install.sh https://raw.githubusercontent.com/HalloLabsOrg/HalloProjects/main/install.sh

# 2. Jalankan installer (gunakan sudo jika diperlukan)
chmod +x install.sh
./install.sh
```

Script ini akan otomatis:

- Memeriksa dependensi sistem (`docker`, `git`, `curl`).
- Meminta input `DOMAIN` dan kredensial Admin.
- Membuat file `.env` dengan key enkripsi dan password database yang aman.
- Menjalankan stack kontainer Docker.
- Melakukan migrasi database dan seeding template awal.

---

## Manual Installation (Fallback)

Jika Anda ingin mengonfigurasi dan menjalankan container secara manual:

```bash
# 1. Clone repository
git clone https://github.com/HalloLabsOrg/HalloProjects.git
cd HalloProjects

# 2. Salin environment file
cp .env.example .env

# 3. Edit konfigurasi (domain, JWT secret, database password)
nano .env

# 4. Jalankan services
docker compose -f docker/docker-compose.yml up -d

# 5. Jalankan database migrations & seed templates
docker compose -f docker/docker-compose.yml exec -T api pnpm --filter @hallo/api exec prisma migrate deploy
docker compose -f docker/docker-compose.yml exec -T api pnpm --filter @hallo/api run seed
```

---

## Verifikasi Instalasi

Untuk memastikan semua container berjalan dengan baik:

```bash
# Cek semua container yang aktif
docker compose -f docker/docker-compose.yml ps

# Cek log runtime salah satu service
docker compose -f docker/docker-compose.yml logs api
```

---

## Update ke Versi Terbaru

Untuk memperbarui sistem ke versi rilis terbaru, Anda dapat menjalankan script update otomatis yang telah kami sediakan:

```bash
# Jalankan script update otomatis
./update.sh
```
