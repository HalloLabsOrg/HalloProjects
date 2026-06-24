<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="logo-light.svg">
    <img alt="HALLO Projects Logo" src="logo-light.svg" width="200" />
  </picture>
</p>

<h1 align="center">HALLO Projects</h1>

<p align="center">
  <strong>Project Control Plane open-source & self-hosted untuk menyatukan seluruh aktivitas project dari repository hingga production dalam satu dashboard terpusat.</strong>
</p>

<p align="center">
  <a href="https://github.com/HalloLabsOrg/HalloProjects/actions/workflows/ci.yml"><img src="https://github.com/HalloLabsOrg/HalloProjects/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" /></a>
  <a href="https://github.com/HalloLabsOrg/HalloProjects/releases"><img src="https://img.shields.io/github/v/release/HalloLabsOrg/HalloProjects" alt="Release" /></a>
</p>

<p align="center">
  <a href="#-english-version">English</a> • 
  <a href="#-versi-bahasa-indonesia">Bahasa Indonesia</a>
</p>

---

## 🇬🇧 English Version

### 🌟 What is HALLO Projects?
**HALLO Projects** is an open-source, self-hosted **Project Control Plane**. Its goal is not to replace deployment engines/PaaS (like Coolify) or source repositories (like GitHub), but to serve as a centralized **control plane (lapisan kontrol)** that bridges and unifies your entire application development lifecycle.

With a clean dashboard and git-centric workflows, you can manage source repositories, track live deployment tasks, configure secure environments (encrypted with AES-256-GCM), view logs, and monitor HTTP service health without hopping between multiple disconnected tools (GitHub, Coolify, and VPS servers).

---

### ⚖️ Comparisons & Roles

#### What Differentiates HALLO Projects?
Unlike traditional PaaS solutions that directly manage target server environments or build engines, **HALLO Projects** is positioned as an **Orchestration / Control Plane** layer.

| Characteristic | HALLO Projects | Coolify / CapRover | Vercel / Heroku |
| :--- | :--- | :--- | :--- |
| **Category** | Control Plane / Orchestrator | Deployment Engine (Self-Hosted PaaS) | Closed SaaS PaaS |
| **Main Goal** | Unifies repo & deployment engines in a single project dashboard | Builds & runs Docker containers directly on VPS servers | Instant code hosting on proprietary cloud servers |
| **Integration Model** | Connects third-party APIs (GitHub, Coolify, etc.) | Acts as the direct target server host | Manages closed proprietary cloud infrastructure |
| **Multi-Server Control** | Yes, one centralized dashboard managing multiple deployment instances | Limited to local host or engine-created clusters | Yes, fully managed by SaaS provider |
| **Infra Flexibility** | Very High (Use any deployment engine via SDK) | Medium (Locked to local Docker/Nixpacks management) | Low (Vendor lock-in to SaaS platform) |

#### Role Orchestration Schematic
HALLO Projects acts as an orchestrator between Code Repositories and Deployment Engines:

```mermaid
graph TD
    User([User / Browser]) -->|Access Dashboard / API| HP[HalloProjects Control Plane]
    
    subgraph Providers [Provider Integrations]
        HP -->|GitHub API| GH[GitHub API / Webhook]
        HP -->|Coolify API| CF[Coolify Deployment Provider]
    end
    
    subgraph Infra [Infrastruktur VPS]
        GH -->|Webhooks / Sync| HP
        CF -->|Orkestrasi Container| VPS[Target VPS Server]
    end

    style HP fill:#4f46e5,stroke:#312e81,stroke-width:2px,color:#fff
    style GH fill:#24292e,stroke:#1b1f23,stroke-width:1px,color:#fff
    style CF fill:#f43f5e,stroke:#be123c,stroke-width:1px,color:#fff
    style VPS fill:#0ea5e9,stroke:#0369a1,stroke-width:1px,color:#fff
```

---

### 🎯 Solution Scenarios
HALLO Projects solves traditional server management overhead through practical use-cases:
1. **Server Cost Efficiency**: Isolate multiple web services (API, frontend, workers, database) into secure Docker networks routed automatically behind Caddy Reverse Proxy sharing the same VPS.
2. **Push-to-Deploy**: Connect your GitHub PAT token. HALLO Projects configures repository webhooks automatically. Pushing commits triggers live builds immediately.
3. **Secret Security**: Encrypt env variables in the database using AES-256-GCM and mask (`***`) secret variables in UI/API outputs.
4. **Logs & Control**: Cancel hanging builds or view live stdout logs from the central UI without logging into target servers via SSH.

---

### 🚀 Installation Guide (VPS Production)
We provide a one-liner script to install HALLO Projects on Ubuntu 22.04+ or Debian 12+ hosts.

#### Quickstart (Automated Installation)
Run this command on your VPS:
```bash
curl -fsSL https://raw.githubusercontent.com/HalloLabsOrg/HalloProjects/main/install.sh | bash
```

#### Updating the Platform
To update to the latest release, enter your installation folder and run the update script:
```bash
./update.sh
```

---

### 🛠️ Getting Started
1. **Access Dashboard**: Open your browser at the domain you configured during setup.
2. **Default Credentials**: Log in using the admin email and password created during installation.
3. **Link GitHub Provider**: Go to **Providers**, add your GitHub Personal Access Token (PAT).
4. **Create a Project**: Go to **Projects**, register a workspace and link a repository to trigger your first deploy.

---

### 📖 Full Documentation
Detailed configurations, custom templates schemas, and provider SDK extensions are available:
* **Docs Portal**: `http://docs.your-domain.com` (or `http://localhost:3001` in local dev).

---

## 🇮🇩 Versi Bahasa Indonesia

### 🌟 Apa itu HALLO Projects?
**HALLO Projects** adalah **Project Control Plane** open-source yang dirancang agar dapat dijalankan secara mandiri (self-hosted). Tujuannya bukanlah untuk menggantikan platform deployment/PaaS (seperti Coolify) atau repositori (seperti GitHub), melainkan bertindak sebagai **lapisan kontrol (control plane)** terpusat yang menyatukan seluruh siklus hidup pengembangan aplikasi Anda.

Dengan antarmuka dashboard yang bersih dan alur kerja terpusat, Anda dapat mengelola repositori, melacak status deployment, mengonfigurasi variabel lingkungan yang aman (AES-256-GCM), mengakses logs, serta memantau kesehatan service (health check) tanpa perlu berpindah-pindah antar-layanan (seperti GitHub, Coolify, dan VPS).

---

### ⚖️ Perbandingan & Peran HalloProjects

#### Apa yang Membedakan HalloProjects dengan Produk Lain?
Tidak seperti platform PaaS konvensional yang bertindak langsung sebagai *deployment engine* lokal, **HalloProjects** diposisikan sebagai **Control Plane / Orchestration Layer**. 

Berikut adalah perbandingan karakteristik utama:

| Karakteristik | HalloProjects | Coolify / CapRover | Vercel / Heroku |
| :--- | :--- | :--- | :--- |
| **Kategori** | Control Plane / Orchestrator | Deployment Engine (Self-Hosted) | Closed SaaS PaaS |
| **Tujuan Utama** | Menyatukan repo & deployment engine dalam satu dashboard project terpadu | Membangun & menjalankan kontainer Docker langsung di server VPS | Hosting kode instan di server proprietary mereka |
| **Model Integrasi** | Menghubungkan API pihak ketiga (GitHub, Coolify, dll.) | Bertindak sebagai host server target langsung | Mengelola infrastruktur cloud proprietary tertutup |
| **Multi-Server Control** | Ya, satu kontrol panel terpusat untuk mengelola banyak instansi deployment | Terbatas pada server lokal atau cluster bentukan engine sendiri | Ya, dikelola penuh oleh provider SaaS |
| **Fleksibilitas Infra** | Sangat Tinggi (Bisa menggunakan provider deployment apa saja melalui SDK) | Sedang (Terkunci pada manajemen Docker/Nixpacks lokal) | Rendah (Ketergantungan penuh pada platform SaaS) |

#### Skema Peran HalloProjects
HalloProjects bertindak sebagai jembatan orkestrasi antara Repositori Kode dan Deployment Engine. Pengguna tidak perlu mengakses VPS secara langsung; cukup berinteraksi melalui dashboard HalloProjects:

(Lihat skema diagram Mermaid di bagian versi Inggris di atas)

---

### 🎯 Skenario Solusi
HALLO Projects memecahkan masalah manajemen server tradisional melalui beberapa skenario praktis:
1. **Konsolidasi Aplikasi pada Satu VPS (Server Cost Efficiency)**: Mengisolasi setiap service menggunakan container Docker secara otomatis dan mengaturnya di balik Caddy Reverse Proxy dengan routing sub-domain otomatis.
2. **Auto-Deployment Berbasis Git (Push-to-Deploy)**: Hubungkan repositori GitHub Anda menggunakan Personal Access Token (PAT). Setiap kali Anda melakukan `git push` ke branch yang ditentukan, server akan melakukan pull, build, dan deploy versi terbaru secara langsung.
3. **Keamanan Variabel Lingkungan & Secret (Secret Protection)**: Semua variabel lingkungan dienkripsi di database menggunakan AES-256-GCM. Variabel bertipe *Secret* secara otomatis disamarkan (`***`) di API dan dashboard.
4. **Kontrol dan Pemantauan Deployment (Orchestration & Logs)**: Dashboard menampilkan status deployment secara real-time disertai log build langsung. Anda juga dapat membatalkan proses deployment yang sedang berjalan hanya dengan satu klik tombol "Cancel".

---

### 🚀 Panduan Instalasi (VPS Production)
Kami menyediakan skrip installer satu baris untuk memasang HALLO Projects di server berbasis Linux (Ubuntu 22.04+ / Debian 12+) secara otomatis.

#### Cara Cepat (Automated Installation)
Jalankan perintah berikut di server VPS Anda:
```bash
curl -fsSL https://raw.githubusercontent.com/HalloLabsOrg/HalloProjects/main/install.sh | bash
```

#### Memperbarui Platform (Update)
Untuk melakukan update ke versi terbaru, masuk ke folder instalasi dan jalankan script update:
```bash
./update.sh
```

---

### 🛠️ Langkah Awal Penggunaan
1. **Akses Dashboard**: Setelah instalasi selesai, buka browser Anda menuju domain yang Anda masukkan (misal: `http://domain-anda.com`).
2. **Kredensial Default**: Masuk menggunakan email admin dan password yang Anda konfigurasi di awal pemasangan.
3. **Hubungkan GitHub Provider**: Masuk ke menu **Providers**, tambahkan koneksi GitHub baru dengan memasukkan Personal Access Token (PAT) klasik Anda.
4. **Buat Project Baru**: Masuk ke menu **Projects**, buat workspace project baru dan hubungkan repositori Git Anda untuk memulai deployment pertama.

---

### 📖 Dokumentasi Lengkap
Dokumentasi lengkap, panduan konfigurasi variabel, modul reference, skema pembuatan template kustom, dan panduan kontributor dapat diakses melalui server dokumentasi terintegrasi:
* **Server Docs**: `http://docs.domain-anda.com` (atau `http://localhost:3001` di lingkungan pengembangan lokal).

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
