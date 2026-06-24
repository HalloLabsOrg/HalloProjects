---
id: overview
title: Provider System
---

# Provider System

HALLO Projects menggunakan arsitektur provider yang pluggable. Provider diimplementasi di folder `providers/` dan mengikuti interface dari `packages/sdk`.

## Provider Types

| Type           | Community Edition | Future                             |
| -------------- | ----------------- | ---------------------------------- |
| **Repository** | GitHub            | GitLab, Gitea, Bitbucket           |
| **Deployment** | Coolify           | Docker direct, Kubernetes, Railway |

## Repository Provider Interface

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
```

## Deployment Provider Interface

```typescript
// packages/sdk/src/providers/deployment-provider.interface.ts

export interface DeploymentProvider {
  deploy(config: DeployConfig): Promise<DeployResult>;
  getStatus(externalId: string): Promise<DeploymentStatus>;
  getLogs(externalId: string): Promise<string>;
  rollback(externalId: string): Promise<void>;
  listApplications(): Promise<Application[]>;
}
```

## Provider Factory

```typescript
@Injectable()
export class ProviderFactory {
  getRepositoryProvider(connection: ProviderConnection): RepositoryProvider {
    switch (connection.type) {
      case ProviderType.GITHUB:
        return new GithubProvider(this.decrypt(connection.config));
      default:
        throw new Error(`Unsupported provider type: ${connection.type}`);
    }
  }

  getDeploymentProvider(connection: ProviderConnection): DeploymentProvider {
    switch (connection.type) {
      case ProviderType.COOLIFY:
        return new CoolifyProvider(this.decrypt(connection.config));
      default:
        throw new Error(`Unsupported provider type: ${connection.type}`);
    }
  }
}
```

## Menambah Provider Baru

1. Buat folder `providers/your-provider/`
2. Implement interface yang sesuai dari `packages/sdk`
3. Register di `ProviderFactory`
4. Tambah nilai baru di `ProviderType` enum di Prisma schema
5. Buat migration: `pnpm --filter api prisma migrate dev`
6. Tambah docs di `apps/docs/docs/providers/`
