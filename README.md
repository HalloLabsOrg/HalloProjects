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

HALLO Projects dirancang agar mudah dijalankan menggunakan Docker Compose. Ikuti langkah-langkah berikut untuk memasangnya di server VPS Anda.

### Prasyarat

- Server dengan OS Linux (direkomendasikan Ubuntu 22.04 LTS atau lebih baru)
- Docker dan Docker Compose terpasang
- Domain/Sub-domain yang sudah diarahkan (DNS A Record) ke alamat IP server VPS Anda

### Langkah-Langkah Pemasangan

1. **Clone Repositori**:

   ```bash
   git clone https://github.com/hallolabs/hallo-projects.git
   cd hallo-projects
   ```

2. **Siapkan Konfigurasi Environment**:
   Salin file konfigurasi docker environment:

   ```bash
   cp .env.docker .env
   ```

   Buka file `.env` yang baru dibuat dan sesuaikan konfigurasi domain Anda:

   ```env
   DOMAIN=domain-anda.com
   JWT_SECRET=gunakan-string-acak-yang-aman
   ENCRYPTION_KEY=32-karakter-string-kunci-enkripsi
   ```

3. **Jalankan Aplikasi dengan Docker Compose**:
   Mulai service dalam mode daemon:

   ```bash
   docker compose -f docker/docker-compose.yml up -d
   ```

4. **Akses Dashboard**:
   Setelah container berjalan, Caddy akan mengurus sertifikat SSL (HTTPS) secara otomatis. Anda dapat mengakses platform pada alamat sub-domain berikut:
   - **Dashboard UI:** `https://app.domain-anda.com`
   - **API Server:** `https://api.domain-anda.com`
   - **Dokumentasi Panduan:** `https://docs.domain-anda.com`

---

## 🛠️ Langkah Awal Penggunaan

1. **Buat Akun Administrator**: Buka halaman dashboard pada kunjungan pertama untuk mendaftarkan akun administrator utama.
2. **Hubungkan GitHub Provider**: Masuk ke menu **Providers**, tambahkan koneksi GitHub baru dengan memasukkan Personal Access Token (PAT) klasik Anda.
3. **Buat Project Baru**: Masuk ke menu **Projects**, buat workspace project baru dan hubungkan repositori Git Anda untuk memulai deployment pertama.

---

## 📄 Lisensi

Project ini dilisensikan di bawah lisensi MIT - Lihat file [LICENSE](LICENSE) untuk informasi lebih lanjut.
