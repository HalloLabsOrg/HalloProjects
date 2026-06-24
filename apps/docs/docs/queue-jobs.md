---
id: queue-jobs
title: Queue & Background Jobs
sidebar_position: 9
---

# Queue & Background Jobs

HALLO Projects menggunakan **BullMQ** dengan **Redis** untuk semua background processing.

## Queues

| Queue | Job | Trigger | Concurrency |
|---|---|---|---|
| `deployments` | `deploy-service` | Manual/auto deploy | 5 |
| `repository-sync` | `sync-repository` | Manual sync / webhook | 10 |
| `webhooks` | `process-github-webhook` | GitHub webhook | 20 |
| `health-checks` | `check-service-health` | Repeatable (60s) | 20 |

## Job Definitions

### `deploy-service`

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
```

### `sync-repository`

```typescript
interface SyncRepositoryJobData {
  repositoryId: string;
  providerId: string;
  triggerAutoDeployOn?: string; // branch name jika dari webhook
}
// Retry: 2x
// Timeout: 1 menit
```

### `process-github-webhook`

```typescript
interface GithubWebhookJobData {
  event: string;               // "push" | "pull_request"
  repositoryFullName: string;
  branch: string;
  commitSha: string;
  commitMessage: string;
  pushedBy: string;
}
// Retry: 3x
// Timeout: 30 detik
```

### `check-service-health`

```typescript
interface HealthCheckJobData {
  serviceId: string;
  environmentId: string;
  url: string;
}
// Repeatable: setiap 60 detik
// Timeout: 15 detik
// Concurrency: 20
```

## Processor Example

```typescript
@Processor('deployments')
export class DeploymentProcessor {
  @Process('deploy-service')
  async handleDeploy(job: Job<DeployJobData>) {
    const { deploymentId, providerId } = job.data;

    await this.deploymentsService.updateStatus(deploymentId, 'BUILDING');

    const provider = await this.providerFactory.getDeploymentProvider(providerId);
    const result = await provider.deploy(job.data);

    let status: DeploymentStatus;
    do {
      await sleep(5000);
      status = await provider.getStatus(result.externalId);
      await this.deploymentsService.updateStatus(deploymentId, status);
    } while (status === 'BUILDING' || status === 'DEPLOYING');
  }
}
```

## Bull Dashboard

BullMQ menyediakan dashboard untuk monitor queues. Dapat diakses di `/api/queues` saat `NODE_ENV=development`.
