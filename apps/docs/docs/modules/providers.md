---
id: providers
title: Providers Module
---

# Providers Module

Mengelola koneksi ke provider eksternal (GitHub, Coolify).

## Endpoints

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/providers` | List provider connections | ALL |
| `POST` | `/providers` | Add provider connection | ADMIN |
| `GET` | `/providers/:id` | Get provider detail | ALL |
| `POST` | `/providers/:id/test` | Test koneksi | ADMIN |
| `DELETE` | `/providers/:id` | Remove provider | ADMIN |

## Create GitHub Provider

```http
POST /api/providers
Content-Type: application/json

{
  "name": "GitHub - HALLO Labs",
  "type": "GITHUB",
  "config": {
    "personalAccessToken": "ghp_xxxxxxxxxxxx",
    "organization": "hallolabs"
  }
}
```

Token membutuhkan scope: `repo`, `admin:repo_hook`.

## Create Coolify Provider

```http
POST /api/providers
Content-Type: application/json

{
  "name": "Coolify - Production Server",
  "type": "COOLIFY",
  "config": {
    "apiUrl": "https://coolify.myserver.com",
    "apiToken": "xxxxxxxxxxxx"
  }
}
```

## Security

Semua credentials (PAT, API token) dienkripsi dengan **AES-256-GCM** sebelum disimpan ke database. Nilai asli tidak pernah dikembalikan di response API — hanya metadata (name, type, lastTestedAt).
