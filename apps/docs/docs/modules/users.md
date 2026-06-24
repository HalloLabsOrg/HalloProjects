---
id: users
title: Users Module
---

# Users Module

Manajemen pengguna sistem. Semua endpoint hanya bisa diakses oleh **ADMIN**.

## Endpoints

| Method   | Path                 | Description              | Role  |
| -------- | -------------------- | ------------------------ | ----- |
| `GET`    | `/users`             | List semua users         | ADMIN |
| `POST`   | `/users`             | Create user baru         | ADMIN |
| `GET`    | `/users/:id`         | Get user detail          | ADMIN |
| `PATCH`  | `/users/:id`         | Update user (name, role) | ADMIN |
| `PATCH`  | `/users/:id/disable` | Disable user             | ADMIN |
| `DELETE` | `/users/:id`         | Delete user              | ADMIN |

## Roles

| Role        | Keterangan                                      |
| ----------- | ----------------------------------------------- |
| `ADMIN`     | Full access ke semua fitur                      |
| `DEVELOPER` | Bisa create project, trigger deploy, manage env |
| `VIEWER`    | Read-only access                                |

## DTOs

```typescript
class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  @MinLength(8)
  password: string;
}

class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}
```
