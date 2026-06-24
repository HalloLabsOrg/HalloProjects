---
id: api-contracts
title: API Contracts
sidebar_position: 8
---

# API Contracts

## Base URL

```
https://your-domain/api
```

## Authentication

Semua endpoint (kecuali `/auth/login`) membutuhkan header:

```
Authorization: Bearer <jwt_token>
```

## Standard Response

**Success:**

```json
{
  "data": { ... }
}
```

**Success with pagination:**

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8
  }
}
```

**Error:**

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "email must be a valid email address"
    }
  ]
}
```

## Pagination

Semua list endpoint mendukung query params:

| Param       | Default     | Max | Keterangan        |
| ----------- | ----------- | --- | ----------------- |
| `page`      | 1           | —   | Halaman           |
| `limit`     | 20          | 100 | Items per halaman |
| `search`    | —           | —   | Full-text search  |
| `sortBy`    | `createdAt` | —   | Field untuk sort  |
| `sortOrder` | `desc`      | —   | `asc` atau `desc` |

## HTTP Status Codes

| Code  | Keterangan                           |
| ----- | ------------------------------------ |
| `200` | OK                                   |
| `201` | Created                              |
| `202` | Accepted (async job queued)          |
| `400` | Bad Request / Validation Error       |
| `401` | Unauthorized (token invalid/missing) |
| `403` | Forbidden (role tidak cukup)         |
| `404` | Not Found                            |
| `409` | Conflict (duplicate slug, etc.)      |
| `500` | Internal Server Error                |

## Swagger / OpenAPI

API documentation tersedia di:

```
https://your-domain/api/docs
```

Tersedia saat `NODE_ENV=development` atau `SWAGGER_ENABLED=true`.
