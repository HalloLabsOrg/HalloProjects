---
id: auth-authorization
title: Auth & Authorization
sidebar_position: 11
---

# Auth & Authorization

## Role Permission Matrix

| Action | ADMIN | DEVELOPER | VIEWER |
|---|:---:|:---:|:---:|
| Manage users | ✅ | ❌ | ❌ |
| Connect providers | ✅ | ❌ | ❌ |
| Create project | ✅ | ✅ | ❌ |
| Edit project | ✅ | ✅ | ❌ |
| Archive project | ✅ | ❌ | ❌ |
| Create service | ✅ | ✅ | ❌ |
| Delete service | ✅ | ❌ | ❌ |
| Trigger deploy | ✅ | ✅ | ❌ |
| Cancel deploy | ✅ | ✅ | ❌ |
| Manage environments | ✅ | ✅ | ❌ |
| View/edit variables | ✅ | ✅ | ❌ |
| View monitoring | ✅ | ✅ | ✅ |
| View deployments | ✅ | ✅ | ✅ |
| View audit logs | ✅ | ❌ | ❌ |
| Manage templates | ✅ | ❌ | ❌ |
| Apply templates | ✅ | ✅ | ❌ |

## JWT Structure

```json
{
  "sub": "clx0user1",
  "email": "user@example.com",
  "role": "ADMIN",
  "iat": 1705305600,
  "exp": 1705392000
}
```

Token expire: **24 jam** (configurable via `JWT_EXPIRES_IN`)

## Security

| Aspek | Implementasi |
|---|---|
| Password hashing | bcrypt, salt rounds: 12 |
| Provider credentials | AES-256-GCM encryption |
| Environment variables | AES-256-GCM encryption |
| Secret variable masking | Nilai ditampilkan sebagai `***` |
| Webhook validation | HMAC-SHA256 timing-safe compare |
| JWT signing | HS256 dengan `JWT_SECRET` |
