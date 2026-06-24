# HALLO Projects — Technical Documentation

**Version:** 2.0  
**Edition:** Community Edition (Open Source)  
**Owner:** HALLO Labs  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Monorepo Structure](#4-monorepo-structure)
5. [Database Schema](#5-database-schema)
6. [Module Reference](#6-module-reference)
7. [Provider System](#7-provider-system)
8. [API Contracts](#8-api-contracts)
9. [Queue & Background Jobs](#9-queue--background-jobs)
10. [Dynamic Template Engine](#10-dynamic-template-engine)
11. [Authentication & Authorization](#11-authentication--authorization)
12. [Deployment Guide](#12-deployment-guide)
13. [Environment Variables](#13-environment-variables)
14. [Contributing Guide](#14-contributing-guide)
15. [Build Roadmap & Task Checklist](#15-build-roadmap--task-checklist)

---

## 1. Overview

HALLO Projects adalah **Project Control Plane** open-source yang self-hosted. Tujuannya bukan menggantikan GitHub atau Coolify, melainkan menjadi **lapisan kontrol** yang menyatukan seluruh aktivitas project — dari repository hingga production — dalam satu dashboard.

### Problem Statement

Developer dan tim saat ini harus berpindah-pindah antara:
- GitHub (source code & repository)
- Coolify (deployment & server management)
- Cloudflare (DNS & proxy)
- Server VPS (monitoring & logs)

HALLO Projects menghilangkan friction tersebut dengan menyediakan satu antarmuka yang terhubung ke semua tools tersebut.

### Core Philosophy

| Prinsip | Penjelasan |
|---|---|
| **Repository First** | Repository adalah sumber kebenaran utama untuk semua entitas |
| **Provider Agnostic** | Provider dapat diganti tanpa mengubah inti sistem |
| **Self Hosted First** | Semua data berada di server milik pengguna |
| **Community Maintainable** | Struktur kode harus mudah dipahami kontributor baru |
| **Configuration Over Code** | Konfigurasi dilakukan melalui UI dan template, bukan hardcode |

---

## 2. Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User / Browser                       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼────────────────────────────────┐
│                    Caddy (Reverse Proxy)                  │
│              Automatic HTTPS + Load Balancing             │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
┌──────────────▼──────────┐  ┌────────────▼───────────────┐
│    Next.js Web Console   │  │       NestJS REST API        │
│       (Port 3000)        │  │         (Port 4000)          │
└─────────────────────────┘  └────────────┬───────────────┘
                                           │
                             ┌─────────────▼───────────────┐
                             │        Prisma ORM            │
                             └─────────────┬───────────────┘
                                           │
                             ┌─────────────▼───────────────┐
                             │         PostgreSQL            │
                             │          (Port 5432)          │
                             └─────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    NestJS Worker                          │
│              (Background Job Processor)                   │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │      BullMQ + Redis      │
              │       (Port 6379)        │
              └────────────┬────────────┘
                           │
         ┌─────────────────┼──────────────────┐
         │                 │                  │
┌────────▼───────┐ ┌───────▼───────┐ ┌───────▼────────┐
│ GitHub Provider │ │Coolify Provider│ │ Health Checker │
└─────────────────┘ └───────────────┘ └────────────────┘
```

### 2.2 Data Flow

#### Deploy Flow
```
User triggers deploy via UI
       │
       ▼
NestJS API creates Deployment record (status: PENDING)
       │
       ▼
Pushes job ke BullMQ queue "deployments"
       │
       ▼
Worker picks up job
       │
       ▼
Worker calls Coolify Provider → deploy()
       │
       ▼
Worker polls Coolify for status every 5s
       │
       ▼
Updates Deployment record (BUILDING → DEPLOYING → SUCCESS/FAILED)
       │
       ▼
Frontend polls /deployments/:id untuk live status
```

#### Repository Sync Flow
```
GitHub Webhook fires (push event)
       │
       ▼
NestJS API receives webhook at /webhooks/github
       │
       ▼
Validates webhook signature (HMAC-SHA256)
       │
       ▼
Pushes job ke BullMQ queue "repository-sync"
       │
       ▼
Worker fetches latest commit info dari GitHub API
       │
       ▼
Updates Repository record di database
       │
       ▼
Triggers auto-deploy jika branch match environment config
```

### 2.3 Component Interaction Diagram

```
┌───────────────────────────────────────────────────────────────┐
│ Next.js Web                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ TanStack Query│  │ Zustand Store│  │  React Hook Form     │ │
│  │ (server state)│  │(client state)│  │  + Zod validation    │ │
│  └──────┬───────┘  └──────────────┘  └──────────────────────┘ │
└─────────┼─────────────────────────────────────────────────────┘
          │ HTTP/REST
┌─────────▼─────────────────────────────────────────────────────┐
│ NestJS API                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Controllers  │  │   Services   │  │     Guards/Pipes     │ │
│  │  (Routes)     │  │ (Business    │  │  (JWT Auth, Roles,   │ │
│  │               │  │  Logic)      │  │   Validation)        │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘ │
└─────────┼─────────────────┼──────────────────────────────────┘
          │                 │
    ┌─────▼──────┐   ┌──────▼──────┐
    │  Prisma ORM │   │   BullMQ    │
    └─────┬──────┘   └──────┬──────┘
          │                 │
    ┌─────▼──────┐   ┌──────▼──────┐
    │ PostgreSQL  │   │    Redis    │
    └────────────┘   └─────────────┘
```

---

## 3. Technology Stack

### 3.1 Frontend (`apps/web`)

| Layer | Technology | Version | Alasan |
|---|---|---|---|
| Framework | Next.js | 14+ (App Router) | SSR, routing, popular |
| Language | TypeScript | 5+ | Type safety |
| Styling | Tailwind CSS | 3+ | Utility-first, fast |
| Component | shadcn/ui | latest | Accessible, customizable |
| Icons | Lucide Icons | latest | Consistent, tree-shakeable |
| State (server) | TanStack Query | 5+ | Caching, refetching, devtools |
| State (client) | Zustand | 4+ | Simple, minimal boilerplate |
| Forms | React Hook Form | 7+ | Performance, uncontrolled |
| Validation | Zod | 3+ | Runtime + type-level schema |

### 3.2 Backend (`apps/api`)

| Layer | Technology | Version | Alasan |
|---|---|---|---|
| Framework | NestJS | 10+ | OOP, DI, modular, enterprise |
| Language | TypeScript | 5+ | Type safety |
| Authentication | JWT (Passport.js) | — | Stateless, scalable |
| Validation | class-validator | — | Decorator-based, NestJS native |
| Transformation | class-transformer | — | DTO serialization |
| ORM | Prisma | 5+ | Type-safe queries, migrations |
| Database | PostgreSQL | 15+ | Relational, ACID, reliable |

### 3.3 Worker (`apps/worker`)

| Layer | Technology | Alasan |
|---|---|---|
| Framework | NestJS (standalone) | Reuse modules dari API |
| Queue | BullMQ | Reliable, Redis-backed |
| Message Broker | Redis | Fast, pub/sub |

### 3.4 Infrastructure

| Komponen | Technology | Alasan |
|---|---|---|
| Reverse Proxy | Caddy | Auto HTTPS, simple config |
| Container | Docker + Compose | Portable, community standard |
| Database | PostgreSQL 15 | — |
| Cache/Queue | Redis 7 | — |

---

## 4. Monorepo Structure

```
hallo-projects/
├── apps/
│   ├── web/                     # Next.js frontend
│   │   ├── app/                 # App Router pages
│   │   │   ├── (auth)/          # Login, register pages
│   │   │   ├── (dashboard)/     # Main app layout
│   │   │   │   ├── dashboard/
│   │   │   │   ├── projects/
│   │   │   │   ├── repositories/
│   │   │   │   ├── deployments/
│   │   │   │   ├── monitoring/
│   │   │   │   ├── templates/
│   │   │   │   ├── providers/
│   │   │   │   ├── users/
│   │   │   │   ├── audit-logs/
│   │   │   │   └── settings/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui base components
│   │   │   ├── shared/          # Shared layout components
│   │   │   └── features/        # Feature-specific components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utilities, API client
│   │   ├── stores/              # Zustand stores
│   │   └── types/               # TypeScript types
│   │
│   ├── api/                     # NestJS REST API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── projects/
│   │   │   │   ├── repositories/
│   │   │   │   ├── services/
│   │   │   │   ├── deployments/
│   │   │   │   ├── environments/
│   │   │   │   ├── monitoring/
│   │   │   │   ├── templates/
│   │   │   │   ├── providers/
│   │   │   │   ├── webhooks/
│   │   │   │   └── audit-logs/
│   │   │   ├── common/
│   │   │   │   ├── guards/      # AuthGuard, RolesGuard
│   │   │   │   ├── decorators/  # @Roles(), @CurrentUser()
│   │   │   │   ├── filters/     # Global exception filters
│   │   │   │   ├── interceptors/# Logging, transform
│   │   │   │   └── pipes/       # Validation pipes
│   │   │   ├── prisma/          # PrismaService
│   │   │   └── main.ts
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── migrations/
│   │
│   └── worker/                  # NestJS background worker
│       └── src/
│           ├── processors/
│           │   ├── deployment.processor.ts
│           │   ├── repository-sync.processor.ts
│           │   ├── health-check.processor.ts
│           │   └── webhook.processor.ts
│           └── main.ts
│
├── packages/
│   ├── ui/                      # Shared UI components (React)
│   ├── sdk/                     # Provider SDK types & interfaces
│   ├── templates/               # Built-in project templates
│   └── shared/                  # Shared types, constants, utils
│
├── providers/
│   ├── github/                  # GitHub provider implementation
│   └── coolify/                 # Coolify provider implementation
│
├── docker/
│   ├── Caddyfile
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
│
├── docs/                        # Documentation
├── .env.example
├── package.json                 # Root workspace config (pnpm)
└── turbo.json                   # Turborepo pipeline config
```

### 4.1 Module Structure Pattern

Setiap NestJS module mengikuti struktur standar:

```
modules/projects/
├── dto/
│   ├── create-project.dto.ts
│   ├── update-project.dto.ts
│   └── project-response.dto.ts
├── projects.controller.ts       # Route handlers
├── projects.service.ts          # Business logic
├── projects.module.ts           # Module definition
└── projects.types.ts            # Module-specific types
```

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram

```
User ──────────────< AuditLog
 │
 └──── (created_by) ──────────> Project
                                    │
                                    ├──────────< Service
                                    │               │
                                    │               ├── repository_id ──> Repository
                                    │               ├── environment_id ──> Environment
                                    │               └──────────< Deployment
                                    │
                                    └──────────< Environment
                                                    │
                                                    └──────────< EnvironmentVariable

Repository ──── provider_id ──> ProviderConnection
Deployment ──── provider_id ──> ProviderConnection

ProviderConnection (type: GITHUB | COOLIFY)
MonitoringResult ──── service_id ──> Service
```

### 5.2 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────

enum Role {
  ADMIN
  DEVELOPER
  VIEWER
}

enum ProviderType {
  GITHUB
  COOLIFY
}

enum DeploymentStatus {
  PENDING
  BUILDING
  DEPLOYING
  SUCCESS
  FAILED
  CANCELLED
}

enum MonitoringStatus {
  ONLINE
  OFFLINE
  SLOW
  UNKNOWN
}

enum ProjectStatus {
  ACTIVE
  ARCHIVED
}

enum AuditAction {
  USER_LOGIN
  USER_LOGOUT
  USER_CREATED
  USER_UPDATED
  USER_DISABLED
  PROJECT_CREATED
  PROJECT_UPDATED
  PROJECT_ARCHIVED
  SERVICE_CREATED
  SERVICE_UPDATED
  SERVICE_DELETED
  DEPLOYMENT_TRIGGERED
  DEPLOYMENT_CANCELLED
  ENVIRONMENT_CREATED
  ENVIRONMENT_UPDATED
  ENVIRONMENT_DELETED
  VARIABLE_CREATED
  VARIABLE_UPDATED
  VARIABLE_DELETED
  PROVIDER_CONNECTED
  PROVIDER_DISCONNECTED
  TEMPLATE_UPLOADED
  TEMPLATE_APPLIED
  REPOSITORY_SYNCED
}

// ─── Core Entities ───────────────────────────────────────

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String
  passwordHash String    @map("password_hash")
  role         Role      @default(DEVELOPER)
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  auditLogs    AuditLog[]
  projects     Project[]  @relation("ProjectCreator")

  @@map("users")
}

model ProviderConnection {
  id          String       @id @default(cuid())
  name        String
  type        ProviderType
  config      Json         // encrypted credentials
  isActive    Boolean      @default(true) @map("is_active")
  lastTestedAt DateTime?   @map("last_tested_at")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  repositories Repository[]
  deployments  Deployment[]

  @@map("provider_connections")
}

model Repository {
  id            String    @id @default(cuid())
  providerId    String    @map("provider_id")
  externalId    String    @map("external_id")   // GitHub repo ID
  name          String
  fullName      String    @map("full_name")      // e.g. "org/repo"
  url           String
  defaultBranch String    @map("default_branch")
  visibility    String                           // "public" | "private"
  lastCommitSha String?   @map("last_commit_sha")
  lastCommitMsg String?   @map("last_commit_msg")
  lastCommitAt  DateTime? @map("last_commit_at")
  syncedAt      DateTime? @map("synced_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  provider      ProviderConnection @relation(fields: [providerId], references: [id])
  services      Service[]

  @@unique([providerId, externalId])
  @@map("repositories")
}

model Project {
  id          String        @id @default(cuid())
  name        String
  slug        String        @unique
  description String?
  status      ProjectStatus @default(ACTIVE)
  createdById String        @map("created_by_id")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  createdBy    User          @relation("ProjectCreator", fields: [createdById], references: [id])
  services     Service[]
  environments Environment[]

  @@map("projects")
}

model Service {
  id           String   @id @default(cuid())
  projectId    String   @map("project_id")
  repositoryId String   @map("repository_id")
  name         String
  slug         String
  branch       String   @default("main")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  project      Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  repository   Repository   @relation(fields: [repositoryId], references: [id])
  deployments  Deployment[]
  monitoring   MonitoringResult[]

  @@unique([projectId, slug])
  @@map("services")
}

model Environment {
  id        String   @id @default(cuid())
  projectId String   @map("project_id")
  name      String                        // "production" | "staging" | "development"
  slug      String
  branch    String?                       // branch yang trigger auto-deploy
  domain    String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  project    Project               @relation(fields: [projectId], references: [id], onDelete: Cascade)
  variables  EnvironmentVariable[]
  deployments Deployment[]

  @@unique([projectId, slug])
  @@map("environments")
}

model EnvironmentVariable {
  id            String   @id @default(cuid())
  environmentId String   @map("environment_id")
  key           String
  value         String                        // encrypted at rest
  isSecret      Boolean  @default(false) @map("is_secret")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  environment   Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@unique([environmentId, key])
  @@map("environment_variables")
}

model Deployment {
  id           String           @id @default(cuid())
  serviceId    String           @map("service_id")
  environmentId String          @map("environment_id")
  providerId   String           @map("provider_id")
  externalId   String?          @map("external_id")  // Coolify deployment ID
  status       DeploymentStatus @default(PENDING)
  branch       String
  commitSha    String?          @map("commit_sha")
  commitMsg    String?          @map("commit_msg")
  triggeredBy  String           @map("triggered_by")  // user ID or "auto"
  startedAt    DateTime?        @map("started_at")
  completedAt  DateTime?        @map("completed_at")
  logs         String?          @db.Text
  createdAt    DateTime         @default(now()) @map("created_at")

  service      Service            @relation(fields: [serviceId], references: [id])
  environment  Environment        @relation(fields: [environmentId], references: [id])
  provider     ProviderConnection @relation(fields: [providerId], references: [id])

  @@map("deployments")
}

model MonitoringResult {
  id           String           @id @default(cuid())
  serviceId    String           @map("service_id")
  environmentId String?         @map("environment_id")
  url          String
  status       MonitoringStatus
  statusCode   Int?             @map("status_code")
  responseTime Int?             @map("response_time")  // milliseconds
  checkedAt    DateTime         @default(now()) @map("checked_at")

  service      Service @relation(fields: [serviceId], references: [id])

  @@index([serviceId, checkedAt])
  @@map("monitoring_results")
}

model AuditLog {
  id         String      @id @default(cuid())
  userId     String?     @map("user_id")
  action     AuditAction
  entityType String?     @map("entity_type")
  entityId   String?     @map("entity_id")
  metadata   Json?
  ipAddress  String?     @map("ip_address")
  userAgent  String?     @map("user_agent")
  createdAt  DateTime    @default(now()) @map("created_at")

  user       User? @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
  @@index([action, createdAt])
  @@map("audit_logs")
}

model Template {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  version     String
  author      String?
  isActive    Boolean  @default(true) @map("is_active")
  schema      Json                        // form schema definition
  files       Json                        // template file tree
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("templates")
}
```

---

## 6. Module Reference

### 6.1 Auth Module

**Endpoints:**

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/login` | Login dengan email + password | — |
| POST | `/auth/logout` | Invalidate token (client-side) | JWT |
| POST | `/auth/change-password` | Ganti password | JWT |
| GET | `/auth/me` | Get current user info | JWT |

**Login Flow:**
1. Client mengirim `email` + `password`
2. Service mencari user by email, verifikasi bcrypt hash
3. Jika valid, return `access_token` (JWT, expire 24h)
4. Semua request berikutnya menyertakan header `Authorization: Bearer <token>`

**DTOs:**
```typescript
// login.dto.ts
class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// auth-response.dto.ts
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

---

### 6.2 Users Module

**Endpoints:**

| Method | Path | Description | Auth | Role |
|---|---|---|---|---|
| GET | `/users` | List semua users | JWT | ADMIN |
| POST | `/users` | Create user baru | JWT | ADMIN |
| GET | `/users/:id` | Get user by ID | JWT | ADMIN |
| PATCH | `/users/:id` | Update user | JWT | ADMIN |
| PATCH | `/users/:id/disable` | Disable user | JWT | ADMIN |
| DELETE | `/users/:id` | Delete user | JWT | ADMIN |

---

### 6.3 Projects Module

**Endpoints:**

| Method | Path | Description | Auth | Role |
|---|---|---|---|---|
| GET | `/projects` | List semua projects | JWT | ALL |
| POST | `/projects` | Create project baru | JWT | ADMIN, DEVELOPER |
| GET | `/projects/:id` | Get project detail | JWT | ALL |
| PATCH | `/projects/:id` | Update project | JWT | ADMIN, DEVELOPER |
| POST | `/projects/:id/archive` | Archive project | JWT | ADMIN |
| DELETE | `/projects/:id` | Delete project | JWT | ADMIN |

**DTOs:**
```typescript
// create-project.dto.ts
class CreateProjectDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

---

### 6.4 Repositories Module

**Endpoints:**

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/repositories` | List semua repositories | JWT |
| GET | `/repositories/:id` | Get repository detail | JWT |
| POST | `/repositories/sync` | Trigger manual sync ke provider | JWT |
| GET | `/repositories/:id/branches` | List branches dari provider | JWT |

---

### 6.5 Services Module

Services adalah unit deploy dalam sebuah project.

**Endpoints:**

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/projects/:projectId/services` | List services | JWT |
| POST | `/projects/:projectId/services` | Create service | JWT |
| GET | `/projects/:projectId/services/:id` | Get service | JWT |
| PATCH | `/projects/:projectId/services/:id` | Update service | JWT |
| DELETE | `/projects/:projectId/services/:id` | Delete service | JWT |

**DTOs:**
```typescript
// create-service.dto.ts
class CreateServiceDto {
  @IsString()
  name: string;

  @IsString()
  repositoryId: string;

  @IsString()
  branch: string;

  @IsString()
  @IsOptional()
  environmentId?: string;
}
```

---

### 6.6 Environments Module

**Endpoints:**

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/projects/:projectId/environments` | List environments | JWT |
| POST | `/projects/:projectId/environments` | Create environment | JWT |
| GET | `/projects/:projectId/environments/:id` | Get environment | JWT |
| PATCH | `/projects/:projectId/environments/:id` | Update environment | JWT |
| DELETE | `/projects/:projectId/environments/:id` | Delete environment | JWT |
| GET | `/projects/:projectId/environments/:id/variables` | List variables | JWT |
| POST | `/projects/:projectId/environments/:id/variables` | Create variable | JWT |
| PATCH | `/projects/:projectId/environments/:id/variables/:varId` | Update variable | JWT |
| DELETE | `/projects/:projectId/environments/:id/variables/:varId` | Delete variable | JWT |

**Built-in Environments:** `development`, `staging`, `production`

---

### 6.7 Deployments Module

**Endpoints:**

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/deployments` | List deployments (semua) | JWT |
| GET | `/services/:serviceId/deployments` | List deployments per service | JWT |
| POST | `/services/:serviceId/deploy` | Trigger manual deploy | JWT |
| GET | `/deployments/:id` | Get deployment detail + logs | JWT |
| POST | `/deployments/:id/cancel` | Cancel deployment | JWT |

**Deploy Request:**
```typescript
class TriggerDeployDto {
  @IsString()
  environmentId: string;

  @IsString()
  @IsOptional()
  branch?: string;  // override default branch
}
```

**Deployment Status Lifecycle:**
```
PENDING → BUILDING → DEPLOYING → SUCCESS
                              └→ FAILED
         └→ CANCELLED (jika di-cancel sebelum selesai)
```

---

### 6.8 Monitoring Module

Monitoring berjalan sebagai recurring job di worker, bukan triggered oleh user.

**Endpoints:**

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/monitoring` | Overview status semua services | JWT |
| GET | `/monitoring/:serviceId` | Status + history satu service | JWT |
| GET | `/monitoring/:serviceId/history` | Riwayat check (pagination) | JWT |

**Health Check Logic (Worker):**
```typescript
// Interval: setiap 60 detik (configurable via env)
// Timeout: 10 detik per request
// Status mapping:
//   response time < 1000ms  → ONLINE
//   response time >= 1000ms → SLOW
//   request error / timeout → OFFLINE
//   status code >= 500      → OFFLINE
```

---

### 6.9 Providers Module

**Endpoints:**

| Method | Path | Description | Auth | Role |
|---|---|---|---|---|
| GET | `/providers` | List provider connections | JWT | ALL |
| POST | `/providers` | Add provider connection | JWT | ADMIN |
| GET | `/providers/:id` | Get provider detail | JWT | ALL |
| POST | `/providers/:id/test` | Test koneksi | JWT | ADMIN |
| DELETE | `/providers/:id` | Remove provider | JWT | ADMIN |

**Create GitHub Provider:**
```typescript
class CreateGithubProviderDto {
  @IsString()
  name: string;

  type: 'GITHUB';

  config: {
    personalAccessToken: string;  // encrypted before storage
    organization?: string;
  };
}
```

**Create Coolify Provider:**
```typescript
class CreateCoolifyProviderDto {
  @IsString()
  name: string;

  type: 'COOLIFY';

  config: {
    apiUrl: string;         // e.g. "https://coolify.myserver.com"
    apiToken: string;       // encrypted before storage
  };
}
```

---

### 6.10 Webhooks Module

**Endpoints:**

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/webhooks/github` | Receive GitHub webhook | Signature |

**Webhook Validation:**
```typescript
// HMAC-SHA256 signature validation
// Header: X-Hub-Signature-256: sha256=<hash>
// Secret: GITHUB_WEBHOOK_SECRET env variable
```

**Supported Events:** `push`, `pull_request`

---

### 6.11 Audit Logs Module

**Endpoints:**

| Method | Path | Description | Auth | Role |
|---|---|---|---|---|
| GET | `/audit-logs` | List audit logs | JWT | ADMIN |

**Query Parameters:**
- `userId` — filter by user
- `action` — filter by action type
- `from` / `to` — date range (ISO 8601)
- `page` / `limit` — pagination

---

### 6.12 Templates Module

**Endpoints:**

| Method | Path | Description | Auth | Role |
|---|---|---|---|---|
| GET | `/templates` | List templates | JWT | ALL |
| POST | `/templates` | Upload template (.zip) | JWT | ADMIN |
| GET | `/templates/:id` | Get template + schema | JWT | ALL |
| POST | `/templates/:id/apply` | Apply template ke project | JWT | ADMIN, DEVELOPER |
| PATCH | `/templates/:id/toggle` | Enable/disable template | JWT | ADMIN |
| DELETE | `/templates/:id` | Delete template | JWT | ADMIN |

---

## 7. Provider System

### 7.1 Provider Interface

Semua provider mengimplementasi interface dari `packages/sdk`:

```typescript
// packages/sdk/src/providers/repository-provider.interface.ts

export interface RepositoryProvider {
  listRepositories(): Promise<Repository[]>;
  getRepository(id: string): Promise<Repository>;
  getBranches(repositoryId: string): Promise<Branch[]>;
  getCommit(repositoryId: string, branch: string): Promise<Commit>;
  registerWebhook(repositoryId: string, config: WebhookConfig): Promise<Webhook>;
  validateWebhookSignature(payload: Buffer, signature: string): boolean;
}

// packages/sdk/src/providers/deployment-provider.interface.ts

export interface DeploymentProvider {
  deploy(config: DeployConfig): Promise<DeployResult>;
  getStatus(externalId: string): Promise<DeploymentStatus>;
  getLogs(externalId: string): Promise<string>;
  rollback(externalId: string): Promise<void>;
  listApplications(): Promise<Application[]>;
}
```

### 7.2 GitHub Provider

**File:** `providers/github/src/github.provider.ts`

```typescript
export class GithubProvider implements RepositoryProvider {
  private octokit: Octokit;

  constructor(config: GithubConfig) {
    this.octokit = new Octokit({ auth: config.personalAccessToken });
  }

  async listRepositories(): Promise<Repository[]> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
    });
    return data.map(this.mapToRepository);
  }

  validateWebhookSignature(payload: Buffer, signature: string): boolean {
    const hmac = createHmac('sha256', this.config.webhookSecret);
    const digest = `sha256=${hmac.update(payload).digest('hex')}`;
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  }
  // ...
}
```

### 7.3 Coolify Provider

**File:** `providers/coolify/src/coolify.provider.ts`

```typescript
export class CoolifyProvider implements DeploymentProvider {
  private client: AxiosInstance;

  constructor(config: CoolifyConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: { Authorization: `Bearer ${config.apiToken}` },
    });
  }

  async deploy(config: DeployConfig): Promise<DeployResult> {
    const { data } = await this.client.post(`/api/v1/deploy`, {
      uuid: config.applicationUuid,
      force: config.force ?? false,
    });
    return { externalId: data.deployment_uuid };
  }

  async getStatus(externalId: string): Promise<DeploymentStatus> {
    const { data } = await this.client.get(`/api/v1/deployments/${externalId}`);
    return this.mapCoolifyStatus(data.status);
  }
  // ...
}
```

---

## 8. API Contracts

### 8.1 Standard Response Format

**Success:**
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145
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

### 8.2 Pagination

Semua list endpoint mendukung query params:
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `search` — full-text search pada field relevan
- `sortBy` — field untuk sorting
- `sortOrder` — `asc` | `desc`

### 8.3 Authentication Header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 8.4 Example: Create Project

**Request:**
```http
POST /api/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "KODEPIN",
  "description": "Platform belajar coding untuk Indonesia"
}
```

**Response `201 Created`:**
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

### 8.5 Example: Trigger Deploy

**Request:**
```http
POST /api/services/clx1svc1/deploy
Authorization: Bearer <token>
Content-Type: application/json

{
  "environmentId": "clx1env1"
}
```

**Response `202 Accepted`:**
```json
{
  "data": {
    "id": "clx1deploy1",
    "serviceId": "clx1svc1",
    "environmentId": "clx1env1",
    "status": "PENDING",
    "branch": "main",
    "triggeredBy": "clx0user1",
    "createdAt": "2025-01-15T09:00:00.000Z"
  }
}
```

---

## 9. Queue & Background Jobs

### 9.1 Queue Architecture

```
Redis
 ├── Queue: "deployments"
 │     └── Job: deploy-service
 ├── Queue: "repository-sync"
 │     └── Job: sync-repository
 ├── Queue: "webhooks"
 │     └── Job: process-github-webhook
 └── Queue: "health-checks"
       └── Job: check-service-health (repeatable)
```

### 9.2 Job Definitions

#### `deploy-service`
```typescript
interface DeployJobData {
  deploymentId: string;
  serviceId: string;
  environmentId: string;
  providerId: string;
  branch: string;
  commitSha?: string;
}

// Retry: 3x dengan exponential backoff
// Timeout: 10 menit
// Concurrency: 5 jobs parallel
```

#### `sync-repository`
```typescript
interface SyncRepositoryJobData {
  repositoryId: string;
  providerId: string;
  triggerAutoDeployOn?: string;  // branch name jika dari webhook
}

// Retry: 2x
// Timeout: 1 menit
```

#### `process-github-webhook`
```typescript
interface GithubWebhookJobData {
  event: string;           // "push" | "pull_request"
  repositoryFullName: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  pushedBy: string;
}

// Retry: 3x
// Timeout: 30 detik
```

#### `check-service-health`
```typescript
interface HealthCheckJobData {
  serviceId: string;
  environmentId: string;
  url: string;
}

// Repeatable: setiap 60 detik
// Timeout: 15 detik per check
// Concurrency: 20 jobs parallel
```

### 9.3 Worker Processor Example

```typescript
@Processor('deployments')
export class DeploymentProcessor {
  constructor(
    private readonly deploymentsService: DeploymentsService,
    private readonly providerFactory: ProviderFactory,
  ) {}

  @Process('deploy-service')
  async handleDeploy(job: Job<DeployJobData>) {
    const { deploymentId, providerId } = job.data;

    await this.deploymentsService.updateStatus(deploymentId, 'BUILDING');

    const provider = await this.providerFactory.getDeploymentProvider(providerId);
    const result = await provider.deploy(job.data);

    // Poll status
    let status: DeploymentStatus;
    do {
      await sleep(5000);
      status = await provider.getStatus(result.externalId);
      await this.deploymentsService.updateStatus(deploymentId, status);
    } while (status === 'BUILDING' || status === 'DEPLOYING');
  }
}
```

---

## 10. Dynamic Template Engine

### 10.1 Template Package Structure

```
my-template.zip
├── template.json      # Metadata
├── schema.json        # Form schema
├── preview.png        # Preview image
├── README.md          # Dokumentasi
└── files/
    ├── .env.example
    ├── docker-compose.yml
    └── README.md
```

### 10.2 `template.json`

```json
{
  "name": "Node.js + PostgreSQL Starter",
  "slug": "nodejs-postgres",
  "description": "Template untuk aplikasi Node.js dengan PostgreSQL database",
  "version": "1.0.0",
  "author": "HALLO Labs",
  "tags": ["nodejs", "postgresql", "backend"]
}
```

### 10.3 `schema.json`

Schema mendefinisikan form yang ditampilkan ke user saat apply template.

```json
{
  "fields": [
    {
      "id": "app_name",
      "label": "Application Name",
      "type": "text",
      "required": true,
      "placeholder": "my-awesome-app"
    },
    {
      "id": "domain",
      "label": "Domain",
      "type": "text",
      "required": true,
      "placeholder": "app.example.com"
    },
    {
      "id": "db_enabled",
      "label": "Enable Database",
      "type": "boolean",
      "default": true
    },
    {
      "id": "db_name",
      "label": "Database Name",
      "type": "text",
      "dependsOn": { "field": "db_enabled", "value": true },
      "default": "{{ app_name }}_db"
    },
    {
      "id": "environment",
      "label": "Environment",
      "type": "select",
      "options": ["development", "staging", "production"],
      "default": "production"
    }
  ]
}
```

### 10.4 Template Variables dalam Files

File di dalam `files/` dapat menggunakan template variables dengan sintaks `{{ variable_name }}`:

```yaml
# files/docker-compose.yml
services:
  app:
    image: node:20-alpine
    environment:
      - NODE_ENV={{ environment }}
      - DATABASE_URL=postgresql://{{ app_name }}:password@db:5432/{{ db_name }}

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB={{ db_name }}
    volumes:
      - {{ app_name }}_data:/var/lib/postgresql/data
```

### 10.5 Template Engine Flow

```
User pilih template
       │
       ▼
UI render form dari schema.json
       │
       ▼
User isi form values
       │
       ▼
POST /templates/:id/apply dengan { projectId, values }
       │
       ▼
Server render semua files/ dengan nilai dari form
(replace {{ variable }} dengan actual values)
       │
       ▼
Generate output:
 - Environment variables → disimpan ke EnvironmentVariable
 - docker-compose.yml → disimpan sebagai config
 - README.md → disimpan sebagai project notes
```

---

## 11. Authentication & Authorization

### 11.1 JWT Structure

```json
{
  "sub": "clx0user1",
  "email": "user@example.com",
  "role": "ADMIN",
  "iat": 1705305600,
  "exp": 1705392000
}
```

### 11.2 Role Permission Matrix

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
| View variables | ✅ | ✅ | ❌ |
| Edit variables | ✅ | ✅ | ❌ |
| View monitoring | ✅ | ✅ | ✅ |
| View deployments | ✅ | ✅ | ✅ |
| View audit logs | ✅ | ❌ | ❌ |
| Manage templates | ✅ | ❌ | ❌ |
| Apply templates | ✅ | ✅ | ❌ |

### 11.3 Guard Implementation

```typescript
// NestJS route protection
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Delete(':id')
async deleteUser(@Param('id') id: string) { ... }
```

### 11.4 Security Considerations

- Password hashing: **bcrypt** dengan salt rounds 12
- Sensitive config (API tokens, credentials): **AES-256-GCM** encryption sebelum disimpan ke database
- Environment variables yang `isSecret: true`: nilai di-mask di API response (tampilkan `***`)
- Webhook signature validation: timing-safe comparison untuk mencegah timing attacks

---

## 12. Deployment Guide

### 12.1 Requirements

**VPS Minimum:**
- OS: Ubuntu 22.04+ / Debian 12+
- CPU: 2 vCPU
- RAM: 2 GB
- Storage: 30 GB SSD

**Software Requirements:**
- Docker Engine 24+
- Docker Compose Plugin 2+
- Git

### 12.2 Installation via Docker Compose

```bash
# 1. Clone repository
git clone https://github.com/hallolabs/hallo-projects.git
cd hallo-projects

# 2. Copy environment file
cp .env.example .env

# 3. Edit konfigurasi
nano .env

# 4. Jalankan semua services
docker compose up -d

# 5. Jalankan database migrations
docker compose exec api npx prisma migrate deploy

# 6. Buat admin user pertama
docker compose exec api npm run seed:admin
```

### 12.3 Docker Compose Services

```yaml
# docker-compose.yml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    depends_on:
      - web
      - api
      - docs

  web:
    image: hallolabs/hallo-projects-web:latest
    environment:
      - NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
    depends_on:
      - api

  api:
    image: hallolabs/hallo-projects-api:latest
    environment:
      - DATABASE_URL=postgresql://hallo:${DB_PASSWORD}@postgres:5432/hallo_projects
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      - postgres
      - redis

  worker:
    image: hallolabs/hallo-projects-worker:latest
    environment:
      - DATABASE_URL=postgresql://hallo:${DB_PASSWORD}@postgres:5432/hallo_projects
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  docs:
    image: hallolabs/hallo-projects-docs:latest
    depends_on:
      - web

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=hallo_projects
      - POSTGRES_USER=hallo
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  caddy_data:
  postgres_data:
  redis_data:
```

### 12.4 Caddyfile

```caddyfile
{$DOMAIN} {
  reverse_proxy /api/* api:4000
  reverse_proxy /webhooks/* api:4000
  reverse_proxy * web:3000
}

docs.{$DOMAIN} {
  reverse_proxy * docs:80
}
```

---

## 13. Environment Variables

### 13.1 API (`apps/api`)

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | ✅ | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | ✅ | Secret untuk signing JWT | `random-256-bit-string` |
| `JWT_EXPIRES_IN` | — | JWT expiration (default: 24h) | `24h` |
| `ENCRYPTION_KEY` | ✅ | Key untuk enkripsi credentials (32 bytes) | `random-32-byte-hex` |
| `PORT` | — | Port API (default: 4000) | `4000` |
| `GITHUB_WEBHOOK_SECRET` | — | Secret untuk validasi GitHub webhooks | `random-string` |
| `LOG_LEVEL` | — | Log level (default: info) | `info` \| `debug` \| `error` |

### 13.2 Web (`apps/web`)

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Base URL API | `https://projects.example.com/api` |

### 13.3 Worker (`apps/worker`)

| Variable | Required | Description |
|---|:---:|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `HEALTH_CHECK_INTERVAL` | — | Interval health check dalam detik (default: 60) |
| `HEALTH_CHECK_TIMEOUT` | — | Timeout per request dalam detik (default: 10) |
| `DEPLOYMENT_POLL_INTERVAL` | — | Interval polling status deploy dalam detik (default: 5) |

---

## 14. Contributing Guide

### 14.1 Prerequisites

```bash
# Node.js 20+
node --version

# pnpm 8+
pnpm --version

# Docker + Docker Compose
docker --version
```

### 14.2 Local Development Setup

```bash
# Clone & install dependencies
git clone https://github.com/hallolabs/hallo-projects.git
cd hallo-projects
pnpm install

# Start infrastructure (postgres + redis only)
docker compose -f docker-compose.dev.yml up -d

# Copy dan isi env
cp .env.example .env

# Generate Prisma client + run migrations
pnpm --filter api prisma generate
pnpm --filter api prisma migrate dev

# Seed data awal
pnpm --filter api run seed

# Start semua apps dalam development mode
pnpm dev
```

Setelah setup:
- **Web:** http://localhost:3000
- **API:** http://localhost:4000
- **API Docs (Swagger):** http://localhost:4000/docs

### 14.3 Development Workflow

```bash
# Buat feature branch
git checkout -b feat/nama-feature

# Run tests sebelum commit
pnpm test

# Lint check
pnpm lint

# Build check
pnpm build
```

### 14.4 Adding a New Provider

1. Buat folder baru di `providers/your-provider/`
2. Implementasikan `RepositoryProvider` atau `DeploymentProvider` dari `packages/sdk`
3. Register provider di `ProviderFactory` di `apps/api`
4. Tambahkan tipe baru di `ProviderType` enum di Prisma schema
5. Buat migration: `pnpm --filter api prisma migrate dev`
6. Tambahkan dokumentasi di `docs/providers/`

### 14.5 Commit Convention

Menggunakan [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(projects): add archive project feature
fix(deployments): handle timeout error from Coolify
docs: update provider setup guide
chore: upgrade prisma to 5.8
```

### 14.6 Release Roadmap

| Version | Status | Features |
|---|---|---|
| v0.1 Alpha | Planned | Auth, Users, GitHub, Coolify, Projects, Deployments |
| v0.2 | Planned | Webhook processing, Auto-deploy, Deployment history |
| v0.3 | Planned | Monitoring, Health checks, Environment variables |
| v0.4 | Planned | Template engine, Template registry, Template upload |
| v1.0 | Planned | Documentation, Installer, Docker images, Community templates, Provider SDK |

---

---

## 15. Build Roadmap & Task Checklist

> Legend: `[ ]` belum dikerjakan · `[x]` selesai · `[~]` in progress

---

### v0.1 Alpha — Foundation

**Goal:** Sistem bisa login, connect ke GitHub & Coolify, buat project, dan trigger deploy manual.

#### 📦 Monorepo & Infrastructure Setup

- [x] Init monorepo dengan `pnpm workspaces` + Turborepo
- [x] Setup `apps/web` — Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [x] Setup `apps/api` — NestJS + TypeScript + Prisma
- [x] Setup `apps/worker` — NestJS standalone + BullMQ
- [x] Setup `packages/shared` — shared types & constants
- [x] Setup `packages/sdk` — provider interfaces
- [x] Setup `packages/ui` — shared React components (placeholder)
- [x] Setup `docker-compose.yml` — postgres, redis, caddy, web, api, worker
- [x] Setup `docker-compose.dev.yml` — postgres + redis only (untuk local dev)
- [x] Setup Caddyfile dengan reverse proxy config
- [x] Setup `turbo.json` pipeline (dev, build, test, lint)
- [x] Setup ESLint + Prettier + shared config di root
- [x] Setup `.env.example` dengan semua variable yang dibutuhkan
- [x] Setup GitHub Actions CI — lint + test + build check

#### 🗄️ Database

- [x] Tulis Prisma schema lengkap (semua model v0.1: User, Project, Service, Repository, Environment, Deployment, ProviderConnection, AuditLog)
- [x] Buat migration awal: `prisma migrate dev --name init`
- [x] Buat `PrismaService` di `apps/api`
- [x] Buat seed script untuk admin user pertama
- [x] Setup database encryption utility untuk field sensitif (AES-256-GCM)

#### 🔐 Auth Module (`apps/api/src/modules/auth`)

- [x] Buat `AuthModule` dengan Passport.js + JWT strategy
- [x] Buat `POST /auth/login` — validasi email + password, return JWT
- [x] Buat `GET /auth/me` — return current user dari token
- [x] Buat `POST /auth/change-password`
- [x] Buat `JwtAuthGuard` untuk protect routes
- [x] Buat `RolesGuard` + `@Roles()` decorator
- [x] Buat `@CurrentUser()` decorator
- [x] Buat global exception filter untuk format error response konsisten
- [x] Setup password hashing dengan bcrypt (salt rounds: 12)

#### 👥 Users Module (`apps/api/src/modules/users`)

- [x] Buat `UsersModule`
- [x] Buat `GET /users` — list users (ADMIN only)
- [x] Buat `POST /users` — create user (ADMIN only)
- [x] Buat `GET /users/:id` — get user detail
- [x] Buat `PATCH /users/:id` — update user (name, role)
- [x] Buat `PATCH /users/:id/disable` — disable user
- [x] Buat DTO + Zod/class-validator untuk semua endpoint

#### 🔌 Providers Module (`apps/api/src/modules/providers`)

- [x] Buat `ProvidersModule`
- [x] Buat `POST /providers` — create provider connection
- [x] Buat `GET /providers` — list providers
- [x] Buat `GET /providers/:id` — get provider detail
- [x] Buat `POST /providers/:id/test` — test koneksi
- [x] Buat `DELETE /providers/:id` — hapus provider
- [x] Enkripsi API token/PAT sebelum disimpan ke database
- [x] Mask token di response API (tampilkan `***` untuk field secret)

#### 🐙 GitHub Provider (`providers/github`)

- [x] Init package `providers/github`
- [x] Implement `GithubProvider` class yang implement `RepositoryProvider` interface
- [x] Implement `listRepositories()` — fetch repos dari GitHub API
- [x] Implement `getRepository(id)` — get single repo
- [x] Implement `getBranches(repositoryId)` — list branches
- [x] Implement `getCommit(repositoryId, branch)` — get latest commit info
- [x] Implement `registerWebhook()` — register webhook ke GitHub repo
- [x] Implement `validateWebhookSignature()` — HMAC-SHA256 validation
- [x] Buat `ProviderFactory` service untuk instantiate provider by type

#### 🚀 Coolify Provider (`providers/coolify`)

- [x] Init package `providers/coolify`
- [x] Implement `CoolifyProvider` class yang implement `DeploymentProvider` interface
- [x] Implement `listApplications()` — fetch apps dari Coolify
- [x] Implement `deploy(config)` — trigger deploy di Coolify
- [x] Implement `getStatus(externalId)` — polling status deployment
- [x] Implement `getLogs(externalId)` — fetch build logs
- [x] Implement `rollback(externalId)` — rollback deployment
- [x] Handle Coolify API errors & map ke internal error types

#### 📁 Repositories Module (`apps/api/src/modules/repositories`)

- [x] Buat `RepositoriesModule`
- [x] Buat `GET /repositories` — list semua repositories (dengan pagination + search)
- [x] Buat `GET /repositories/:id` — get repository detail
- [x] Buat `GET /repositories/:id/branches` — list branches via provider
- [x] Buat `POST /repositories/sync` — trigger manual sync semua repos dari provider
- [x] Background job: `sync-repository` processor di worker

#### 📂 Projects Module (`apps/api/src/modules/projects`)

- [x] Buat `ProjectsModule`
- [x] Buat `POST /projects` — create project (auto-generate slug)
- [x] Buat `GET /projects` — list projects (dengan pagination + search)
- [x] Buat `GET /projects/:id` — get project detail (include services + environments count)
- [x] Buat `PATCH /projects/:id` — update project
- [x] Buat `POST /projects/:id/archive` — archive project
- [x] Buat `DELETE /projects/:id` — delete project (ADMIN only)

#### ⚙️ Services Module (`apps/api/src/modules/services`)

- [x] Buat `ServicesModule`
- [x] Buat `POST /projects/:projectId/services` — create service
- [x] Buat `GET /projects/:projectId/services` — list services
- [x] Buat `GET /projects/:projectId/services/:id` — get service detail
- [x] Buat `PATCH /projects/:projectId/services/:id` — update service
- [x] Buat `DELETE /projects/:projectId/services/:id` — delete service

#### 🌍 Environments Module (`apps/api/src/modules/environments`)

- [x] Buat `EnvironmentsModule`
- [x] Buat `POST /projects/:projectId/environments` — create environment
- [x] Buat `GET /projects/:projectId/environments` — list environments
- [x] Buat `PATCH /projects/:projectId/environments/:id` — update environment
- [x] Buat `DELETE /projects/:projectId/environments/:id` — delete environment
- [x] Auto-seed 3 default environments (development, staging, production) saat project dibuat

#### 🚢 Deployments Module (`apps/api/src/modules/deployments`)

- [x] Buat `DeploymentsModule`
- [x] Buat `POST /services/:serviceId/deploy` — trigger manual deploy
- [x] Buat `GET /deployments` — list semua deployments
- [x] Buat `GET /services/:serviceId/deployments` — list deployments per service
- [x] Buat `GET /deployments/:id` — get deployment detail + logs
- [x] Background job: `deploy-service` processor di worker
- [x] Status polling loop di worker (PENDING → BUILDING → DEPLOYING → SUCCESS/FAILED)
- [x] Update deployment record setiap status change

#### 📋 Audit Logs Module (`apps/api/src/modules/audit-logs`)

- [x] Buat `AuditLogsModule` dengan `AuditLogService`
- [x] Inject `AuditLogService` ke semua module yang perlu track
- [x] Track events: login, user change, project change, deploy, provider change
- [x] Buat `GET /audit-logs` — list dengan filter (userId, action, date range)

#### 🖥️ Frontend — Auth & Layout (`apps/web`)

- [x] Setup Next.js App Router structure
- [x] Buat layout utama: sidebar + top nav + content area
- [x] Buat halaman Login (`/login`)
- [x] Setup TanStack Query provider + Axios API client dengan JWT interceptor
- [x] Setup Zustand store untuk auth state (user, token)
- [x] Auto-redirect ke `/login` jika token expired atau tidak ada
- [x] Buat komponen sidebar dengan semua menu item
- [x] Buat halaman 404 + error boundary

#### 🖥️ Frontend — Core Pages

- [x] Dashboard (`/dashboard`) — stats cards: total projects, failed deployments, offline services, recent activity
- [x] Projects list (`/projects`) — tabel + search + create button
- [x] Project detail (`/projects/:id`) — tabs: Overview, Services, Deployments, Environments
- [x] Repositories list (`/repositories`) — tabel + search + sync button
- [x] Deployments list (`/deployments`) — tabel dengan status badge + filter
- [x] Deployment detail (`/deployments/:id`) — status timeline + logs viewer
- [x] Providers (`/providers`) — list + connect GitHub form + connect Coolify form
- [x] Users (`/users`) — list + create user modal (ADMIN only)
- [x] Empty states untuk semua halaman
- [x] Error states dengan actionable message

#### ✅ v0.1 Definition of Done

- [x] User bisa login dan logout
- [x] Admin bisa create/edit/disable user
- [x] Admin bisa connect GitHub dengan PAT
- [x] Admin bisa connect Coolify dengan API token
- [x] User bisa sync repositories dari GitHub
- [x] User bisa create project dengan services
- [x] User bisa trigger manual deploy ke Coolify
- [x] Deployment status terupdate real-time via polling
- [x] Semua actions terekam di audit log
- [x] Bisa diinstall via `docker compose up -d` di fresh Ubuntu VPS

---

### v0.2 — Automation

**Goal:** Deploy otomatis saat push ke branch, webhook processing, dan deployment history yang lengkap.

#### 🔗 Webhooks Module (`apps/api/src/modules/webhooks`)

- [x] Buat `WebhooksModule`
- [x] Buat `POST /webhooks/github` — receive GitHub push + pull_request events
- [x] Validate webhook signature (HMAC-SHA256 dengan `X-Hub-Signature-256`)
- [x] Parse payload dan extract: repo, branch, commit SHA, commit message, pusher
- [x] Push job ke queue `webhooks` untuk diproses async
- [x] Background job: `process-github-webhook` processor di worker
- [x] Auto-register webhook ke GitHub saat provider connection dibuat
- [x] Handle webhook replay / retry dari GitHub

#### 🤖 Auto Deploy Logic

- [x] Di `EnvironmentsModule`, tambah field `branchMapping` — branch mana yang trigger auto-deploy ke environment ini
- [x] Di webhook processor: setelah update repository, cek apakah ada environment yang branch-nya match
- [x] Jika match, automatically create Deployment record dan push job `deploy-service`
- [x] Buat setting per-environment: `autoDeploy: boolean`
- [x] Frontend: toggle auto-deploy di halaman environment settings

#### 📜 Deployment History & Logs

- [x] Simpan raw build logs dari Coolify ke `Deployment.logs` (db column Text)
- [x] Stream logs via SSE (Server-Sent Events) di `GET /deployments/:id/logs/stream`
- [x] Frontend: live log viewer dengan auto-scroll di halaman deployment detail
- [x] Frontend: deployment history timeline di project detail > Deployments tab
- [x] Pagination untuk deployment history (default: 20 per page)
- [x] Filter deployment history by: status, environment, date range

#### ❌ Cancel Deployment

- [x] Buat `POST /deployments/:id/cancel` — cancel deployment yang masih PENDING/BUILDING
- [x] Di Coolify provider: implement cancel/stop deployment jika API tersedia
- [x] Update status ke `CANCELLED` dan catat di audit log
- [x] Frontend: tombol "Cancel" muncul hanya saat deployment masih berjalan

#### 🔔 Deployment Notifications (Basic)

- [x] Simpan deployment result summary (success/fail, duration, commit) di database
- [x] Tampilkan recent deployments dengan status

#### 🖥️ Frontend Updates

- [x] Halaman environment detail dengan toggle auto-deploy
- [x] Branch mapping UI di environment settings
- [x] Live log viewer di deployment detail page
- [x] "Re-deploy" button di deployment history (trigger ulang dengan commit yang sama)
- [x] Filter + search di deployment list

#### ✅ v0.2 Definition of Done

- [x] Push ke branch `main` secara otomatis trigger deploy ke environment production
- [x] Webhook dari GitHub diterima dan diproses dalam < 5 detik
- [x] Deployment logs bisa dilihat real-time saat deploy sedang berjalan
- [x] User bisa cancel deployment yang sedang berjalan
- [x] Deployment history menampilkan semua riwayat dengan filter

---

### v0.3 — Observability

**Goal:** Monitoring health services, environment variable management, dan domain tracking.

#### 💊 Monitoring Module (`apps/api/src/modules/monitoring`)

- [x] Buat `MonitoringModule`
- [x] Buat `GET /monitoring` — overview status semua services (grouped by project)
- [x] Buat `GET /monitoring/:serviceId` — status + uptime percentage 24h
- [x] Buat `GET /monitoring/:serviceId/history` — riwayat check dengan pagination
- [x] Background job: `check-service-health` (repeatable, interval: 60 detik)
- [x] Health check logic: HTTP GET ke URL, ukur response time, map ke status (ONLINE/SLOW/OFFLINE)
- [x] Simpan setiap result ke `MonitoringResult` table
- [x] Index `(serviceId, checkedAt)` untuk query efisien
- [x] Configurable timeout per service (default: 10 detik)
- [x] Configurable check interval via env `HEALTH_CHECK_INTERVAL`

#### 🌐 Domain & Health Check URL per Environment

- [x] Tambah field `domain` dan `healthCheckUrl` ke `Environment` model
- [x] Buat migration untuk fields baru
- [x] Frontend: form edit environment dengan domain + health check URL
- [x] Worker menggunakan `healthCheckUrl` jika ada, fallback ke domain root

#### 🔑 Environment Variables Module (`apps/api/src/modules/environments`)

- [x] Buat `GET /projects/:projectId/environments/:id/variables` — list variables (mask secret values)
- [x] Buat `POST /projects/:projectId/environments/:id/variables` — create variable
- [x] Buat `PATCH /projects/:projectId/environments/:id/variables/:varId` — update variable
- [x] Buat `DELETE /projects/:projectId/environments/:id/variables/:varId` — delete variable
- [x] Enkripsi value di database untuk semua variables
- [x] Variabel dengan `isSecret: true` hanya tampil sebagai `***` di response
- [x] Endpoint khusus untuk "reveal" secret variable (dengan audit log)
- [x] Bulk import/export variables via JSON / .env format

#### 📊 Dashboard Improvements

- [x] Dashboard cards: total projects, active deployments, offline services, failed deployments (24h)
- [x] Recent activity feed dari audit log
- [x] Services status overview: daftar service dengan status badge (ONLINE/SLOW/OFFLINE)
- [x] Quick actions: deploy, view logs, open domain

#### 🖥️ Frontend — Monitoring & Variables

- [x] Halaman Monitoring (`/monitoring`) — grid semua services dengan status badge + response time
- [x] Service detail monitoring: uptime chart 24h, response time chart
- [x] Environment variables tab di project detail
- [x] Variable form: key, value, toggle isSecret
- [x] "Eye" icon/button untuk reveal secret variable
- [x] Bulk import variables (paste `.env` format)

#### ✅ v0.3 Definition of Done

- [x] Semua services di-check setiap 60 detik
- [x] Dashboard menampilkan service mana yang offline
- [x] User bisa manage environment variables dengan enkripsi
- [x] Domain dan health check URL bisa dikonfigurasi per environment
- [x] Uptime history tersedia minimal 7 hari terakhir

---

### v0.4 — Template Engine

**Goal:** Dynamic template engine yang bisa dipakai community untuk membuat dan share project templates.

#### 🧩 Templates Module (`apps/api/src/modules/templates`)

- [x] Buat `TemplatesModule`
- [x] Buat `GET /templates` — list templates yang aktif
- [x] Buat `POST /templates` — upload template (multipart/form-data, file `.zip`)
- [x] Buat `GET /templates/:id` — get template detail + schema
- [x] Buat `POST /templates/:id/apply` — apply template ke project
- [x] Buat `PATCH /templates/:id/toggle` — enable/disable template
- [x] Buat `DELETE /templates/:id` — hapus template

#### 📦 Template Upload & Parsing

- [x] Validasi struktur `.zip`: harus ada `template.json`, `schema.json`, `files/`
- [x] Parse `template.json` — extract metadata (name, slug, version, author)
- [x] Parse `schema.json` — validate field definitions
- [x] Simpan file tree ke database sebagai JSON
- [x] Simpan `preview.png` dan serve via static file endpoint
- [x] Versioning: jika slug sama tapi version berbeda, simpan sebagai versi baru

#### 🔧 Template Engine — Variable Substitution

- [x] Implement template renderer: replace `{{ variable_name }}` di semua files
- [x] Support conditional blocks: `{% if db_enabled %}...{% endif %}`
- [x] Support default values dari schema jika user tidak mengisi
- [x] Support nested variables: `{{ app_name }}_db`
- [x] Dry-run endpoint: preview output tanpa apply ke project

#### 📋 Apply Template to Project

- [x] Endpoint `POST /templates/:id/apply`:
  - Terima `{ projectId, values }` — form values dari user
  - Render semua files dengan values tersebut
  - Hasil rendering berupa: environment variables, docker-compose config, README
  - Simpan environment variables ke database
  - Return preview output untuk konfirmasi sebelum apply
- [x] Frontend: stepper form — pilih template → isi form → preview → apply
- [x] Setelah apply, tampilkan generated files yang bisa di-download

#### 🖥️ Frontend — Template Pages

- [x] Halaman Templates (`/templates`) — grid card dengan preview image
- [x] Template detail page — schema preview + deskripsi
- [x] Upload template modal (drag & drop `.zip`)
- [x] Apply template wizard (multi-step form)
- [x] Preview panel untuk generated output sebelum apply

#### 📚 Built-in Community Templates (`packages/templates`)

- [x] Template: **Node.js + PostgreSQL** — backend API starter
- [x] Template: **Next.js Static** — frontend deployment
- [x] Template: **Full Stack (Next.js + NestJS + PostgreSQL)** — monorepo starter
- [x] Template: **Worker Service** — background job service

#### ✅ v0.4 Definition of Done

- [x] Admin bisa upload template dari file `.zip`
- [x] User bisa browse dan preview templates
- [x] Apply template menghasilkan environment variables yang langsung tersimpan
- [x] Minimal 3 built-in templates tersedia
- [x] Template versioning bekerja (upload ulang dengan versi baru)

---

### v1.0 — Community Release

**Goal:** Platform siap dipakai publik — dokumentasi lengkap, installer mudah, Docker images published, dan community-ready.

#### 🐳 Docker & Release

- [x] Build dan publish Docker images ke Docker Hub / GitHub Container Registry
  - `hallolabs/hallo-projects-web:latest`
  - `hallolabs/hallo-projects-api:latest`
  - `hallolabs/hallo-projects-worker:latest`
- [x] Tag versioned images: `v1.0.0`, `v1.0.1`, dst.
- [x] Setup GitHub Actions workflow untuk auto-build + push image saat release tag dibuat
- [x] Optimasi image size (multi-stage build, alpine base)
- [x] Health check endpoint di semua services (`GET /health`)

#### 🛠️ Installer & Setup

- [x] Finalisasi `docker-compose.yml` untuk production (semua services + volumes)
- [x] Buat `install.sh` — one-liner installer untuk Ubuntu/Debian:
  - Check prerequisites (Docker, Git)
  - Clone repo
  - Generate random secrets untuk `.env`
  - Run `docker compose up -d`
  - Run migrations
  - Print akses URL + kredensial admin
- [x] Buat `update.sh` — script untuk update ke versi terbaru
- [x] Test installer di fresh Ubuntu 22.04, Ubuntu 24.04, dan Debian 12

#### 📖 Documentation

- [x] Finalisasi `TECHNICAL_DOCUMENTATION.md` (file ini)
- [x] Buat `README.md` untuk root repo — quick start, features, screenshots
- [x] Buat `docs/installation.md` — panduan instalasi lengkap
- [x] Buat `docs/configuration.md` — semua environment variables + penjelasan
- [x] Buat `docs/providers/github.md` — cara setup GitHub integration
- [x] Buat `docs/providers/coolify.md` — cara setup Coolify integration
- [x] Buat `docs/templates/creating-templates.md` — cara buat template sendiri
- [x] Buat `docs/contributing.md` — panduan kontribusi
- [x] Buat `docs/provider-sdk.md` — cara develop provider baru
- [x] Deploy dokumentasi ke GitHub Pages atau Mintlify

#### 🧪 Testing & Quality

- [x] Unit tests untuk semua NestJS services (target: > 70% coverage)
- [x] Integration tests untuk semua API endpoints
- [x] E2E test untuk alur utama: install → login → connect provider → deploy
- [x] Load test: 50 concurrent users, 1000 deployments/day
- [x] Security audit: dependency vulnerabilities, OWASP checklist

#### 🌍 Community

- [x] Buat `CONTRIBUTING.md` dengan code of conduct + contribution guide
- [x] Setup GitHub Discussions untuk Q&A
- [x] Buat issue templates: bug report, feature request, provider request
- [x] Buat Discord server / komunitas untuk users & contributors
- [x] Publish ke GitHub dengan lisensi MIT
- [x] Announce ke komunitas: Product Hunt, Hacker News, Reddit r/selfhosted

#### ✅ v1.0 Definition of Done (Community Release Criteria)

- [x] Instalasi berhasil di fresh Ubuntu VPS dalam < 10 menit
- [x] GitHub integration bekerja end-to-end
- [x] Coolify integration bekerja end-to-end
- [x] Deployment triggering + auto-deploy bekerja
- [x] Monitoring health check bekerja
- [x] Template engine bekerja dengan minimal 3 built-in templates
- [x] Dokumentasi lengkap dan bisa diikuti oleh developer baru
- [x] Docker images tersedia di registry publik
- [x] Semua test pass di CI
- [x] Zero critical security vulnerabilities

---

### v1.1 — Flexible OAuth & Integrations

**Goal:** Dukungan otentikasi fleksibel untuk penyedia repositori (GitHub) dengan mendukung opsi login tombol (OAuth) maupun token statis (PAT), serta peningkatan arsitektur kemitraan lainnya.

#### 🔐 Integrasi & Keamanan
- [x] Implementasi backend OAuth Flow endpoint untuk integrasi GitHub App / OAuth App
- [x] Dukungan penyimpanan token otentikasi dinamis (Client ID, Secret, Redirect URI) di `.env`
- [x] Desain antarmuka pilihan koneksi di frontend: Tombol OAuth (Rekomendasi) & Form PAT (Lanjutan)
- [x] Penyelarasan siklus token (refresh token & expiry handling) pada database

---

### v1.2 — Multi-Account GitHub App (No-env Setup)

**Goal:** Mendukung pendaftaran GitHub App secara dinamis langsung dari dashboard melalui **GitHub App Manifest Flow** (sehingga tidak memerlukan konfigurasi manual pada file `.env` server) dan mendukung integrasi **multi-akun/multi-organisasi GitHub** dalam satu instance.

#### 📦 Arsitektur & Otorisasi
- [x] Implementasi backend Manifest payload generator & callback converter (`POST /conversions`) untuk mendaftarkan GitHub App secara dinamis
- [x] Penyimpanan kredensial App lengkap (App ID, Client ID, Client Secret, Private Key) langsung di database
- [x] Dukungan multi-akun & multi-organisasi melalui instalasi GitHub App publik
- [x] Generate Installation Access Token (IAT) menggunakan RSA JWT signing secara real-time untuk API calls
- [x] Desain UI dashboard untuk inisiasi Manifest Flow dan pengelolaan multi-instalasi akun aktif

---

### Summary Progress Tracker

| Version | Focus | Status | Est. Tasks |
|---|---|---|---|
| v0.1 Alpha | Foundation: Auth, GitHub, Coolify, Projects, Deploy | `[x] Completed` | ~65 tasks |
| v0.2 | Automation: Webhooks, Auto-deploy, Deployment history | `[x] Completed` | ~25 tasks |
| v0.3 | Observability: Monitoring, Env vars, Domains | `[x] Completed` | ~25 tasks |
| v0.4 | Template Engine: Upload, Apply, Built-in templates | `[x] Completed` | ~25 tasks |
| v1.0 | Community Release: Docker, Docs, Installer, Tests | `[x] Completed` | ~30 tasks |
| v1.1 | Security & Integrations: GitHub OAuth, OAuth providers | `[x] Completed` | ~15 tasks |
| v1.2 | Multi-Account App: GitHub App Manifest flow (No-env) | `[x] Completed` | ~15 tasks |

---

*Generated from HALLO Projects PRD v2.0 — HALLO Labs*

