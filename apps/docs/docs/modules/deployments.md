---
id: deployments
title: Deployments Module
---

# Deployments Module

Mengelola proses deployment dari trigger hingga status akhir.

## Endpoints

| Method | Path                               | Description                  |
| ------ | ---------------------------------- | ---------------------------- |
| `GET`  | `/deployments`                     | List semua deployments       |
| `GET`  | `/services/:serviceId/deployments` | List deployments per service |
| `POST` | `/services/:serviceId/deploy`      | Trigger manual deploy        |
| `GET`  | `/deployments/:id`                 | Get deployment detail + logs |
| `POST` | `/deployments/:id/cancel`          | Cancel deployment            |
| `GET`  | `/deployments/:id/logs/stream`     | Stream logs via SSE          |

## Status Lifecycle

```
PENDING → BUILDING → DEPLOYING → SUCCESS
                              └→ FAILED
         └→ CANCELLED
```

| Status      | Keterangan                                      |
| ----------- | ----------------------------------------------- |
| `PENDING`   | Deployment dibuat, menunggu worker              |
| `BUILDING`  | Coolify sedang build image                      |
| `DEPLOYING` | Image selesai di-build, sedang deploy ke server |
| `SUCCESS`   | Deployment berhasil                             |
| `FAILED`    | Deployment gagal                                |
| `CANCELLED` | Di-cancel oleh user                             |

## Trigger Deploy

```http
POST /api/services/clx1svc1/deploy
Authorization: Bearer <token>
Content-Type: application/json

{
  "environmentId": "clx1env1",
  "branch": "main"      // optional, override default branch
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

## Worker Deploy Processor

```typescript
@Process('deploy-service')
async handleDeploy(job: Job<DeployJobData>) {
  const { deploymentId, providerId } = job.data;

  await this.deploymentsService.updateStatus(deploymentId, 'BUILDING');

  const provider = await this.providerFactory.getDeploymentProvider(providerId);
  const result = await provider.deploy(job.data);

  // Poll status setiap 5 detik
  let status: DeploymentStatus;
  do {
    await sleep(5000);
    status = await provider.getStatus(result.externalId);
    await this.deploymentsService.updateStatus(deploymentId, status);
  } while (status === 'BUILDING' || status === 'DEPLOYING');
}
```

## Live Log Streaming

Frontend bisa subscribe ke log stream via SSE:

```javascript
const eventSource = new EventSource(`/api/deployments/${deploymentId}/logs/stream`, {
  headers: { Authorization: `Bearer ${token}` },
});

eventSource.onmessage = (event) => {
  const line = JSON.parse(event.data);
  appendToLogViewer(line.text);
};
```
