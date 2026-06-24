# Panduan Kontribusi HALLO Projects

Kami sangat senang Anda tertarik berkontribusi pada HALLO Projects! Dokumen ini membantu Anda memulai alur kerja kontribusi di lokal Anda.

---

## 🛠️ Setup Environment Lokal

HALLO Projects menggunakan struktur Monorepo berbasis **pnpm** dan **Turborepo**.

### Prasyarat

- Node.js v20 atau lebih baru
- pnpm v10 atau lebih baru
- Docker (untuk menjalankan database lokal & redis)

### Langkah Pemasangan

1. **Clone repository**:

   ```bash
   git clone https://github.com/HalloLabsOrg/HalloProjects.git
   cd HalloProjects
   ```

2. **Pasang dependensi**:

   ```bash
   pnpm install
   ```

3. **Nyalakan container database & redis development**:

   ```bash
   docker compose -f docker/docker-compose.dev.yml up -d
   ```

4. **Inisialisasi Database**:
   Salin `.env.example` menjadi `.env` lalu jalankan migrasi database:

   ```bash
   cp .env.example .env
   pnpm --filter @hallo/api exec prisma migrate dev
   pnpm --filter @hallo/api run seed
   ```

5. **Jalankan mode development**:
   ```bash
   pnpm dev
   ```
   Aplikasi dashboard web akan dapat diakses di `http://localhost:3000` dan server API di `http://localhost:4000`.

---

## 🧪 Pengujian & Kualitas Kode

Sebelum membuat Pull Request, pastikan kode Anda lolos seluruh pengujian dan standarisasi kode:

### Menjalankan Linting

Proses linting kami sangat cepat (kurang dari 2 detik). Pastikan tidak ada warning atau error:

```bash
pnpm lint
```

### Menjalankan Unit Tests

Semua test unit di dalam monorepo harus sukses:

```bash
pnpm test
```

---

## 🚀 Alur Kerja Pull Request (PR)

1. Buat branch baru dari `main` dengan nama deskriptif (misal: `feat/gitlab-provider` atau `fix/auth-leak`).
2. Tulis kode Anda beserta unit test yang memadai.
3. Jalankan `pnpm lint` dan `pnpm test` untuk memverifikasi.
4. Lakukan commit dengan pesan yang jelas mengikuti panduan Semantic Commits.
5. Push ke fork repository Anda dan buat Pull Request baru ke branch `main` repositori utama.
