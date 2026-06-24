---
id: architecture
title: Architecture
sidebar_position: 2
---

# Architecture

## High-Level Overview

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
                             └─────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    NestJS Worker                          │
└──────────────────────────┬──────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │      BullMQ + Redis      │
              └────────────┬────────────┘
                           │
         ┌─────────────────┼──────────────────┐
         │                 │                  │
┌────────▼───────┐ ┌───────▼───────┐ ┌───────▼────────┐
│ GitHub Provider │ │Coolify Provider│ │ Health Checker │
└─────────────────┘ └───────────────┘ └────────────────┘
```

## Deploy Flow

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
Worker polls Coolify status setiap 5 detik
       │
       ▼
Updates record: BUILDING → DEPLOYING → SUCCESS / FAILED
       │
       ▼
Frontend polls /deployments/:id untuk live status
```

## Repository Sync Flow

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

## Docker Services

| Service | Image | Port | Keterangan |
|---|---|---|---|
| `caddy` | `caddy:2-alpine` | 80, 443 | Reverse proxy + auto HTTPS |
| `web` | `hallolabs/hallo-projects-web` | 3000 | Next.js frontend |
| `api` | `hallolabs/hallo-projects-api` | 4000 | NestJS REST API |
| `worker` | `hallolabs/hallo-projects-worker` | — | Background job processor |
| `postgres` | `postgres:15-alpine` | 5432 | Database utama |
| `redis` | `redis:7-alpine` | 6379 | Queue & cache |
