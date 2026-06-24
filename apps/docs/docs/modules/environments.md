---
id: environments
title: Environments Module
---

# Environments Module

Environments merepresentasikan tahapan deployment (development, staging, production). Setiap environment memiliki variables, domain, dan konfigurasi auto-deploy sendiri.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/projects/:projectId/environments` | List environments |
| `POST` | `/projects/:projectId/environments` | Create environment |
| `PATCH` | `/projects/:projectId/environments/:id` | Update environment |
| `DELETE` | `/projects/:projectId/environments/:id` | Delete environment |
| `GET` | `/projects/:projectId/environments/:id/variables` | List variables |
| `POST` | `/projects/:projectId/environments/:id/variables` | Create variable |
| `PATCH` | `/projects/:projectId/environments/:id/variables/:varId` | Update variable |
| `DELETE` | `/projects/:projectId/environments/:id/variables/:varId` | Delete variable |

## Built-in Environments

Saat project dibuat, 3 environment berikut otomatis dibuat:

| Name | Slug | Branch default |
|---|---|---|
| Production | `production` | `main` |
| Staging | `staging` | `staging` |
| Development | `development` | `develop` |

## Environment Variables

Semua variable dienkripsi di database. Variable dengan `isSecret: true` hanya tampil sebagai `***` di response API.

```typescript
class CreateVariableDto {
  @IsString()
  key: string;           // e.g. "DATABASE_URL"

  @IsString()
  value: string;         // encrypted before storage

  @IsBoolean()
  @IsOptional()
  isSecret?: boolean;    // default: false
}
```

## Auto-Deploy Configuration

```typescript
class UpdateEnvironmentDto {
  @IsString()
  @IsOptional()
  branch?: string;           // branch yang trigger auto-deploy

  @IsBoolean()
  @IsOptional()
  autoDeploy?: boolean;      // enable/disable auto-deploy

  @IsString()
  @IsOptional()
  domain?: string;           // e.g. "app.example.com"

  @IsString()
  @IsOptional()
  healthCheckUrl?: string;   // e.g. "https://app.example.com/health"
}
```

## Bulk Import Variables

Endpoint mendukung import variables dalam format `.env`:

```http
POST /projects/:projectId/environments/:id/variables/import
Content-Type: text/plain

DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-here
```
