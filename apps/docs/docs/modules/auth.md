---
id: auth
title: Auth Module
---

# Auth Module

Mengelola autentikasi pengguna dengan JWT.

## Endpoints

| Method | Path                    | Description                    | Auth |
| ------ | ----------------------- | ------------------------------ | ---- |
| `POST` | `/auth/login`           | Login dengan email + password  | —    |
| `POST` | `/auth/logout`          | Invalidate token (client-side) | JWT  |
| `POST` | `/auth/change-password` | Ganti password                 | JWT  |
| `GET`  | `/auth/me`              | Get current user info          | JWT  |

## Login Flow

1. Client mengirim `email` + `password`
2. Service mencari user by email, verifikasi bcrypt hash
3. Jika valid, return `access_token` (JWT, expire 24h)
4. Semua request berikutnya menyertakan header `Authorization: Bearer <token>`

## DTOs

```typescript
class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

class AuthResponseDto {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}
```

## JWT Payload

```json
{
  "sub": "clx0user1",
  "email": "user@example.com",
  "role": "ADMIN",
  "iat": 1705305600,
  "exp": 1705392000
}
```

## Guards

```typescript
// Protect individual route
@UseGuards(JwtAuthGuard)
@Get('me')
getMe(@CurrentUser() user: User) { ... }

// Protect route dengan role requirement
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Delete(':id')
deleteUser(@Param('id') id: string) { ... }
```
