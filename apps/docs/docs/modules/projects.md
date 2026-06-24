---
id: projects
title: Projects Module
---

# Projects Module

Project adalah entitas utama di HALLO Projects. Satu project berisi beberapa services dan environments.

## Endpoints

| Method   | Path                    | Description         | Role             |
| -------- | ----------------------- | ------------------- | ---------------- |
| `GET`    | `/projects`             | List semua projects | ALL              |
| `POST`   | `/projects`             | Create project baru | ADMIN, DEVELOPER |
| `GET`    | `/projects/:id`         | Get project detail  | ALL              |
| `PATCH`  | `/projects/:id`         | Update project      | ADMIN, DEVELOPER |
| `POST`   | `/projects/:id/archive` | Archive project     | ADMIN            |
| `DELETE` | `/projects/:id`         | Delete project      | ADMIN            |

## DTOs

```typescript
class CreateProjectDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

## Example Request

```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "KODEPIN",
  "description": "Platform belajar coding untuk Indonesia"
}
```

## Example Response

```json
{
  "data": {
    "id": "clx1abc123",
    "name": "KODEPIN",
    "slug": "kodepin",
    "description": "Platform belajar coding untuk Indonesia",
    "status": "ACTIVE",
    "createdById": "clx0user1",
    "createdAt": "2025-01-15T08:00:00.000Z",
    "updatedAt": "2025-01-15T08:00:00.000Z",
    "services": [],
    "environments": []
  }
}
```

## Notes

- `slug` di-generate otomatis dari `name` (lowercase, hyphenated)
- Saat project dibuat, 3 default environments otomatis dibuat: `development`, `staging`, `production`
- Project yang di-archive tidak bisa di-deploy tapi data tetap tersimpan
