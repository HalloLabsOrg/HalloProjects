<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="logo-light.svg">
    <img alt="HALLO Projects Logo" src="logo-light.svg" width="200" />
  </picture>
</p>

<h1 align="center">HALLO Projects</h1>

<p align="center">
  <strong>Platform-as-a-Service (PaaS) mandiri untuk mengelola, mendeploy, dan mengorkestrasi web service secara otomatis di server Anda sendiri.</strong>
</p>

<p align="center">
  <a href="https://github.com/hallolabs/hallo-projects/actions/workflows/ci.yml"><img src="https://github.com/hallolabs/hallo-projects/workflows/CI/badge.svg" alt="CI Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" /></a>
  <a href="https://github.com/hallolabs/hallo-projects/releases"><img src="https://img.shields.io/github/v/release/hallolabs/hallo-projects" alt="Release" /></a>
</p>

---

## 🌟 Apa itu HALLO Projects?

**HALLO Projects** adalah platform PaaS self-hosted yang dirancang untuk menjembatani kode repositori Anda langsung ke server production (VPS) secara instan. Platform ini menjadi solusi alternatif mandiri (seperti Heroku, Vercel, atau Coolify) yang memberikan kontrol penuh atas infrastruktur Anda tanpa biaya berlangganan bulanan yang mahal.

Dengan antarmuka dashboard yang bersih dan alur kerja berbasis Git, Anda dapat mengelola puluhan service, database, log, dan konfigurasi lingkungan dalam satu panel kontrol terpusat.

---

## 🎯 Skenario Solusi

HALLO Projects memecahkan masalah manajemen server tradisional melalui beberapa skenario praktis:

### 1. Konsolidasi Aplikasi pada Satu VPS (Server Cost Efficiency)

- **Masalah:** Mengelola banyak aplikasi (Frontend, API, Worker, Database) di satu server sering kali rumit karena konflik port, konfigurasi reverse proxy manual, dan overhead resource.
- **Solusi:** HALLO Projects mengisolasi setiap service menggunakan container Docker secara otomatis dan mengaturnya di balik Caddy Reverse Proxy. Semua service dapat berbagi resource server yang sama secara aman dengan routing sub-domain otomatis.

### 2. Auto-Deployment Berbasis Git (Push-to-Deploy)

- **Masalah:** Mengatur pipeline CI/CD manual (GitHub Actions, GitLab CI) membutuhkan konfigurasi SSH key, runner, dan script bash yang rumit di setiap project.
- **Solusi:** Cukup hubungkan repositori GitHub Anda menggunakan Personal Access Token (PAT). HALLO Projects akan mendaftarkan webhook otomatis. Setiap kali Anda melakukan `git push` ke branch yang ditentukan, server akan melakukan pull, build, dan deploy versi terbaru secara langsung.

### 3. Keamanan Variabel Lingkungan & Secret (Secret Protection)

- **Masalah:** Menaruh file `.env` di server rentan bocor, dan menampilkannya secara polos di dashboard admin berisiko tinggi.
- **Solusi:** Semua environment variables dienkripsi di database menggunakan algoritma AES-256-GCM. Untuk variabel bertipe _Secret_, nilainya secara otomatis disamarkan (`***`) di API dan dashboard.

### 4. Kontrol dan Pemantauan Deployment (Orchestration & Logs)

- **Masalah:** Sulit melacak status deployment yang sedang berjalan atau menghentikan proses build yang salah arah tanpa mengakses terminal server via SSH.
- **Solusi:** Dashboard menampilkan status deployment (Pending, Building, Deploying, Success, Failed) secara real-time disertai log build langsung. Operator juga dapat membatalkan proses deployment yang sedang berjalan hanya dengan satu klik tombol "Cancel".

---

## 🚀 Panduan Instalasi (VPS Production)

Kami menyediakan skrip installer satu baris untuk memasang HALLO Projects di server berbasis Linux (Ubuntu 22.04+ / Debian 12+) secara otomatis.

### Cara Cepat (Automated Installation)

Jalankan perintah berikut di server VPS Anda:

```bash
curl -fsSL https://raw.githubusercontent.com/hallolabs/hallo-projects/main/install.sh | bash
```

Skrip ini akan secara otomatis:
1. Memverifikasi persyaratan sistem (`Docker`, `Git`, `Curl`).
2. Menanyakan domain Anda dan konfigurasi awal admin.
3. Membuat environment `.env` dengan password database & JWT secrets acak yang aman.
4. Menarik file, mem-build, dan menyalakan seluruh service container Docker.
5. Menjalankan migrasi database serta mengunggah template bawaan.

### Memperbarui Platform (Update)

Untuk melakukan update ke versi terbaru, masuk ke folder instalasi dan jalankan script update:

```bash
./update.sh
```

---

## 🛠️ Langkah Awal Penggunaan

1. **Akses Dashboard**: Setelah instalasi selesai, buka browser Anda menuju domain yang Anda masukkan (misal: `http://domain-anda.com`).
2. **Kredensial Default**: Masuk menggunakan email admin dan password yang Anda konfigurasi di awal pemasangan.
3. **Hubungkan GitHub Provider**: Masuk ke menu **Providers**, tambahkan koneksi GitHub baru dengan memasukkan Personal Access Token (PAT) klasik Anda.
4. **Buat Project Baru**: Masuk ke menu **Projects**, buat workspace project baru dan hubungkan repositori Git Anda untuk memulai deployment pertama.

---

## 📖 Dokumentasi Lengkap
Dokumentasi lengkap, panduan konfigurasi variabel, modul reference, skema pembuatan template kustom, dan panduan kontributor dapat diakses melalui server dokumentasi terintegrasi:
* Server Docs: `http://docs.domain-anda.com` (atau `http://localhost:3001` di lingkungan pengembangan lokal).

---

## 📄 Lisensi

Project ini dilisensikan di bawah lisensi MIT - Lihat file [LICENSE](LICENSE) untuk informasi lebih lanjut.
