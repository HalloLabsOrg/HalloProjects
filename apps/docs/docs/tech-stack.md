---
id: tech-stack
title: Tech Stack
sidebar_position: 3
---

# Tech Stack

## Frontend (`apps/web`)

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

## Backend (`apps/api`)

| Layer | Technology | Version | Alasan |
|---|---|---|---|
| Framework | NestJS | 10+ | OOP, DI, modular, enterprise |
| Language | TypeScript | 5+ | Type safety |
| Authentication | JWT (Passport.js) | — | Stateless, scalable |
| Validation | class-validator | — | Decorator-based, NestJS native |
| Transformation | class-transformer | — | DTO serialization |
| ORM | Prisma | 5+ | Type-safe queries, migrations |
| Database | PostgreSQL | 15+ | Relational, ACID, reliable |

## Worker (`apps/worker`)

| Layer | Technology | Alasan |
|---|---|---|
| Framework | NestJS (standalone) | Reuse modules dari API |
| Queue | BullMQ | Reliable, Redis-backed |
| Message Broker | Redis | Fast, pub/sub |

## Infrastructure

| Komponen | Technology | Alasan |
|---|---|---|
| Reverse Proxy | Caddy | Auto HTTPS, simple config |
| Container | Docker + Compose | Portable, community standard |
| Database | PostgreSQL 15 | — |
| Cache/Queue | Redis 7 | — |

## Package Manager & Tooling

| Tool | Keterangan |
|---|---|
| `pnpm` | Package manager dengan workspace support |
| `turbo` | Monorepo build system & pipeline |
| `ESLint` | Linting |
| `Prettier` | Code formatting |
| `vitest` | Unit testing |
| `Playwright` | E2E testing |
