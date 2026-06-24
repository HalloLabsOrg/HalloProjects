---
id: templates
title: Templates Module
---

# Templates Module

Lihat [Template Engine](/docs/template-engine) untuk dokumentasi lengkap sistem template.

## Endpoints

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/templates` | List templates yang aktif | ALL |
| `POST` | `/templates` | Upload template (.zip) | ADMIN |
| `GET` | `/templates/:id` | Get template detail + schema | ALL |
| `POST` | `/templates/:id/apply` | Apply template ke project | ADMIN, DEVELOPER |
| `PATCH` | `/templates/:id/toggle` | Enable/disable template | ADMIN |
| `DELETE` | `/templates/:id` | Hapus template | ADMIN |

## Upload Template

```http
POST /api/templates
Content-Type: multipart/form-data

file: <template.zip>
```

File `.zip` harus berisi:
- `template.json` — metadata
- `schema.json` — form schema
- `files/` — template files dengan variable placeholders
- `preview.png` — (opsional) preview image
- `README.md` — (opsional) dokumentasi

## Apply Template

```http
POST /api/templates/:id/apply
Content-Type: application/json

{
  "projectId": "clx1abc123",
  "values": {
    "app_name": "my-app",
    "domain": "app.example.com",
    "db_enabled": true,
    "db_name": "my_app_db"
  }
}
```
