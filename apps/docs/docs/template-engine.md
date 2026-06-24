---
id: template-engine
title: Template Engine
sidebar_position: 10
---

# Template Engine

Salah satu fitur kunci HALLO Projects. Memungkinkan community membuat reusable project templates tanpa modifikasi source code.

## Template Package Structure

```
my-template.zip
├── template.json      # Metadata
├── schema.json        # Form schema
├── preview.png        # Preview image (optional)
├── README.md          # Dokumentasi (optional)
└── files/
    ├── .env.example
    ├── docker-compose.yml
    └── README.md
```

## `template.json`

```json
{
  "name": "Node.js + PostgreSQL Starter",
  "slug": "nodejs-postgres",
  "description": "Template untuk aplikasi Node.js dengan PostgreSQL",
  "version": "1.0.0",
  "author": "HALLO Labs",
  "tags": ["nodejs", "postgresql", "backend"]
}
```

## `schema.json`

Mendefinisikan form yang ditampilkan ke user saat apply template:

```json
{
  "fields": [
    {
      "id": "app_name",
      "label": "Application Name",
      "type": "text",
      "required": true,
      "placeholder": "my-awesome-app"
    },
    {
      "id": "domain",
      "label": "Domain",
      "type": "text",
      "required": true
    },
    {
      "id": "db_enabled",
      "label": "Enable Database",
      "type": "boolean",
      "default": true
    },
    {
      "id": "db_name",
      "label": "Database Name",
      "type": "text",
      "dependsOn": { "field": "db_enabled", "value": true },
      "default": "{{ app_name }}_db"
    },
    {
      "id": "environment",
      "label": "Environment",
      "type": "select",
      "options": ["development", "staging", "production"],
      "default": "production"
    }
  ]
}
```

### Field Types

| Type | Keterangan |
|---|---|
| `text` | Input teks |
| `boolean` | Toggle on/off |
| `select` | Dropdown pilihan |
| `number` | Input angka |
| `password` | Input tersembunyi |

## Variable Substitution

Files di dalam `files/` menggunakan sintaks `{{ variable_name }}`:

```yaml
# files/docker-compose.yml
services:
  app:
    environment:
      - NODE_ENV={{ environment }}
      - DATABASE_URL=postgresql://{{ app_name }}:password@db:5432/{{ db_name }}
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB={{ db_name }}
    volumes:
      - {{ app_name }}_data:/var/lib/postgresql/data
```

### Conditional Blocks

```
{% if db_enabled %}
  db:
    image: postgres:15
{% endif %}
```

## Apply Flow

```
User pilih template
       │
       ▼
UI render form dari schema.json
       │
       ▼
User isi form values
       │
       ▼
POST /templates/:id/apply dengan { projectId, values }
       │
       ▼
Server render semua files/ dengan substitusi values
       │
       ▼
Generate output:
  - Environment variables → disimpan ke EnvironmentVariable table
  - docker-compose.yml → disimpan sebagai config
  - README.md → disimpan sebagai project notes
       │
       ▼
Return preview untuk konfirmasi
```

## Built-in Templates

| Template | Keterangan |
|---|---|
| `nodejs-postgres` | Node.js + PostgreSQL backend |
| `nextjs-static` | Next.js static frontend |
| `fullstack-monorepo` | Next.js + NestJS + PostgreSQL |
| `worker-service` | Background job service |

## Membuat Template Sendiri

1. Buat folder dengan struktur di atas
2. Tulis `template.json` dan `schema.json`
3. Isi folder `files/` dengan template files menggunakan `{{ variable }}` syntax
4. Zip semua file: `zip -r my-template.zip .`
5. Upload via **Templates → Upload Template**
