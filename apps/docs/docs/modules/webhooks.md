---
id: webhooks
title: Webhooks Module
---

# Webhooks Module

Menerima dan memproses webhook dari GitHub untuk trigger auto-deploy.

## Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/webhooks/github` | Receive GitHub webhook | Signature |

## Signature Validation

Setiap request divalidasi dengan HMAC-SHA256:

```typescript
function validateSignature(payload: Buffer, signature: string): boolean {
  const hmac = createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(payload).digest('hex')}`;
  return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}
```

Header yang dicheck: `X-Hub-Signature-256`

## Supported Events

| Event | Aksi |
|---|---|
| `push` | Update repository info + trigger auto-deploy jika branch match |
| `pull_request` | Update repository info (no deploy) |

## Processing Flow

```
GitHub sends webhook
       │
       ▼
API validates signature
       │
       ▼
Push job ke queue "webhooks"
       │
       ▼
Worker: update repository (last commit, branch)
       │
       ▼
Check: ada environment dengan autoDeploy=true & branch match?
       │
       ├── YES → Push job "deploy-service" ke queue
       └── NO  → Done
```

## Setup Webhook di GitHub

Webhook di-register otomatis saat provider connection dibuat. URL webhook: `https://your-domain/api/webhooks/github`

Untuk register manual:

1. Buka GitHub Repository → Settings → Webhooks
2. Add webhook: URL = `https://your-domain/api/webhooks/github`
3. Content type: `application/json`
4. Secret: isi dengan nilai `GITHUB_WEBHOOK_SECRET` dari `.env`
5. Events: pilih `push` dan `pull_request`
