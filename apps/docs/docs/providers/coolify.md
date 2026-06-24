---
id: coolify
title: Coolify Provider
---

# Coolify Provider

Integrasi dengan [Coolify](https://coolify.io) untuk deployment management.

## Prerequisites

- Coolify sudah terinstall di server
- API akses diaktifkan di Coolify Settings

## Setup

### 1. Generate API Token di Coolify

1. Login ke Coolify dashboard
2. Buka **Profile → API Tokens**
3. Generate token baru
4. Copy token

### 2. Connect di HALLO Projects

Buka **Providers → Add Provider → Coolify**, isi:

| Field     | Value                                                |
| --------- | ---------------------------------------------------- |
| Name      | Nama deskriptif, e.g. "Coolify - Production"         |
| API URL   | URL Coolify kamu, e.g. `https://coolify.example.com` |
| API Token | Token dari langkah 1                                 |

Klik **Test Connection** untuk verifikasi, lalu **Save**.

### 3. Link Application

Setiap service perlu di-link ke aplikasi yang sudah ada di Coolify. Di service settings, masukkan **Coolify Application UUID** yang bisa ditemukan di Coolify → Application → Settings.

## Implementation

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

  async getLogs(externalId: string): Promise<string> {
    const { data } = await this.client.get(`/api/v1/deployments/${externalId}/logs`);
    return data.logs;
  }

  private mapCoolifyStatus(coolifyStatus: string): DeploymentStatus {
    const map: Record<string, DeploymentStatus> = {
      queued: 'PENDING',
      in_progress: 'BUILDING',
      finished: 'SUCCESS',
      failed: 'FAILED',
      cancelled: 'CANCELLED',
    };
    return map[coolifyStatus] ?? 'PENDING';
  }
}
```
