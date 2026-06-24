---
id: services
title: Services Module
---

# Services Module

Service adalah unit deploy dalam sebuah project. Satu project bisa memiliki beberapa services (misal: `api`, `web`, `worker`).

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/projects/:projectId/services` | List services |
| `POST` | `/projects/:projectId/services` | Create service |
| `GET` | `/projects/:projectId/services/:id` | Get service detail |
| `PATCH` | `/projects/:projectId/services/:id` | Update service |
| `DELETE` | `/projects/:projectId/services/:id` | Delete service |

## DTOs

```typescript
class CreateServiceDto {
  @IsString()
  name: string;

  @IsString()
  repositoryId: string;

  @IsString()
  branch: string;

  @IsString()
  @IsOptional()
  coolifyApplicationUuid?: string; // UUID aplikasi di Coolify
}
```

## Contoh: Project "KODEPIN" dengan 3 Services

```
KODEPIN (Project)
├── admin-web     → repo: kodepin/admin-web,  branch: main
├── api           → repo: kodepin/api,         branch: main
└── public-web    → repo: kodepin/public-web,  branch: main
```

Setiap service di-deploy secara independen dan bisa memiliki deployment history sendiri.
