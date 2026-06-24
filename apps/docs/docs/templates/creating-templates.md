---
id: creating-templates
title: Creating Custom Templates
---

# Creating Custom Templates

HALLO Projects mendukung template khusus yang dikemas dalam format berkas `.zip`. Halaman ini menjelaskan struktur template, skema variabel, dan cara mengompresinya agar dapat diunggah melalui dashboard admin.

---

## Struktur Folder Template

Setiap file `.zip` template harus memiliki struktur direktori sebagai berikut:

```text
my-custom-template.zip
├── template.json
├── schema.json
├── preview.png          (Optional)
└── files/
    ├── docker-compose.yml
    ├── README.md
    └── .env
```

* **`template.json`**: Berisi data metadata dasar template.
* **`schema.json`**: Mendefinisikan form input variabel dinamis yang akan diisi oleh pengguna saat template diaplikasikan.
* **`preview.png`**: Thumbnail/preview gambar template (opsional, disarankan rasio 16:9).
* **`files/`**: Berisi file-file konfigurasi template sesungguhnya. Variabel-variabel template akan disubstitusikan di dalam folder ini.

---

## 1. Menulis `template.json`

Metadata dasar untuk registrasi template:

```json
{
  "name": "Node.js + Postgres Starter",
  "slug": "nodejs-postgres-starter",
  "version": "1.0.0",
  "description": "Template backend Node.js menggunakan PostgreSQL database siap pakai.",
  "author": "Your Name / Organization"
}
```

* **`slug`**: Identifier unik template (hanya huruf kecil, angka, dan strip).
* **`version`**: Versi template mengikuti standar SemVer.

---

## 2. Menulis `schema.json`

Skema JSON mendefinisikan field input form. Contoh skema yang meminta input variabel `PORT` dan `DB_PASSWORD`:

```json
{
  "properties": {
    "PORT": {
      "type": "number",
      "label": "Application Port",
      "default": 3000,
      "description": "Port yang akan digunakan oleh aplikasi."
    },
    "DB_PASSWORD": {
      "type": "string",
      "label": "Database Password",
      "default": "supersecretpassword",
      "description": "Password database PostgreSQL."
    }
  },
  "required": ["PORT", "DB_PASSWORD"]
}
```

### Tipe Data Skema yang Didukung:
1. `string`: Input teks standard.
2. `number`: Input angka numerik.
3. `boolean`: Checkbox toggle (Yes/No).

---

## 3. Substitusi Variabel pada Berkas di `files/`

Di dalam folder `files/`, Anda dapat menyematkan variabel dinamis menggunakan sintaks penulisan `{{ KEY }}`. 

Contoh berkas `files/docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    image: node:20-alpine
    ports:
      - "{{ PORT }}:{{ PORT }}"
    environment:
      - DATABASE_URL=postgresql://postgres:{{ DB_PASSWORD }}@db:5432/mydb
      
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD={{ DB_PASSWORD }}
```

Saat pengguna menekan tombol **Apply**, engine parser template akan secara otomatis mengganti seluruh sintaks `{{ PORT }}` dan `{{ DB_PASSWORD }}` dengan nilai asli yang telah dimasukkan oleh pengguna di formulir web.

---

## 4. Cara Mengompresi dan Mengunggah

1. Pastikan file `template.json`, `schema.json`, dan folder `files/` berada di tingkat teratas (root) arsip ZIP, bukan di dalam subfolder ekstra.
2. Kompres menggunakan utility CLI atau zip bawaan sistem Anda:
   ```bash
   zip -r my-template.zip template.json schema.json preview.png files/
   ```
3. Masuk ke halaman **Templates** di dashboard Admin HALLO Projects.
4. Drag & Drop atau unggah file `.zip` tersebut.
5. Template siap digunakan secara instan!
