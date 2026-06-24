---
id: monorepo-structure
title: Monorepo Structure
sidebar_position: 4
---

# Monorepo Structure

```
hallo-projects/
├── apps/
│   ├── web/                     # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/          # Login, register pages
│   │   │   └── (dashboard)/     # Main app layout
│   │   │       ├── dashboard/
│   │   │       ├── projects/
│   │   │       ├── repositories/
│   │   │       ├── deployments/
│   │   │       ├── monitoring/
│   │   │       ├── templates/
│   │   │       ├── providers/
│   │   │       ├── users/
│   │   │       ├── audit-logs/
│   │   │       └── settings/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui base components
│   │   │   ├── shared/          # Layout, nav, sidebar
│   │   │   └── features/        # Feature-specific components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # API client, utilities
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
│   │   │   │   ├── guards/      # JwtAuthGuard, RolesGuard
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
│   ├── worker/                  # NestJS background worker
│   │   └── src/
│   │       ├── processors/
│   │       │   ├── deployment.processor.ts
│   │       │   ├── repository-sync.processor.ts
│   │       │   ├── health-check.processor.ts
│   │       │   └── webhook.processor.ts
│   │       └── main.ts
│   │
│   └── docs/                    # Docusaurus documentation site
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
├── .env.example
├── package.json                 # Root workspace (pnpm)
└── turbo.json                   # Turborepo pipeline
```

## Module Structure Pattern

Setiap NestJS module mengikuti struktur standar berikut:

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

## Turborepo Pipeline

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "outputs": ["coverage/**"]
    }
  }
}
```
