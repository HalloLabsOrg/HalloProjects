---
id: audit-logs
title: Audit Logs Module
---

# Audit Logs Module

Mencatat semua aksi penting yang terjadi di sistem untuk keperluan audit dan debugging.

## Endpoints

| Method | Path | Description | Role |
|---|---|---|---|
| `GET` | `/audit-logs` | List audit logs | ADMIN |

## Query Parameters

| Parameter | Type | Keterangan |
|---|---|---|
| `userId` | string | Filter by user |
| `action` | AuditAction | Filter by action type |
| `from` | ISO 8601 | Start date |
| `to` | ISO 8601 | End date |
| `page` | number | Default: 1 |
| `limit` | number | Default: 20, max: 100 |

## Tracked Actions

| Action | Trigger |
|---|---|
| `USER_LOGIN` | Berhasil login |
| `USER_LOGOUT` | Logout |
| `USER_CREATED` | Admin create user baru |
| `USER_UPDATED` | Admin update user |
| `USER_DISABLED` | Admin disable user |
| `PROJECT_CREATED` | Create project |
| `PROJECT_UPDATED` | Update project |
| `PROJECT_ARCHIVED` | Archive project |
| `SERVICE_CREATED` | Create service |
| `SERVICE_DELETED` | Delete service |
| `DEPLOYMENT_TRIGGERED` | Trigger deploy (manual atau auto) |
| `DEPLOYMENT_CANCELLED` | Cancel deployment |
| `ENVIRONMENT_CREATED` | Create environment |
| `VARIABLE_CREATED` | Create env variable |
| `VARIABLE_UPDATED` | Update env variable |
| `VARIABLE_DELETED` | Delete env variable |
| `PROVIDER_CONNECTED` | Connect provider |
| `PROVIDER_DISCONNECTED` | Remove provider |
| `TEMPLATE_UPLOADED` | Upload template |
| `TEMPLATE_APPLIED` | Apply template ke project |
| `REPOSITORY_SYNCED` | Manual sync repository |

## Usage di Service

```typescript
// Inject AuditLogService ke modul lain
constructor(private readonly auditLog: AuditLogService) {}

// Log aksi
await this.auditLog.log({
  userId: currentUser.id,
  action: AuditAction.DEPLOYMENT_TRIGGERED,
  entityType: 'Deployment',
  entityId: deployment.id,
  metadata: { serviceId, branch, environment },
  ipAddress: req.ip,
});
```
