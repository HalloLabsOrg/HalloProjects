---
id: provider-sdk
title: Provider SDK Guide
---

# Provider SDK Guide

HALLO Projects dirancang modular sehingga memudahkan penambahan integrasi provider repository baru (seperti GitLab, Bitbucket) atau deployment provider baru (seperti Portainer, Railway, Kubernetes). Kontrak interface ini didefinisikan secara universal di dalam package `@hallo/sdk`.

---

## 1. Arsitektur Kontrak Interface

Semua provider mengimplementasikan interface TypeScript yang ketat dari `@hallo/sdk`.

### Repository Provider Interface
Setiap repository provider wajib mengimplementasikan interface `RepositoryProvider`:

```typescript
export interface RepositoryProvider {
  /** Mendapatkan info detail repository */
  getRepositoryInfo(repo: string): Promise<RepositoryInfo>;
  
  /** Mengambil daftar branch */
  getBranches(repo: string): Promise<string[]>;
  
  /** Membuat webhook untuk mendeteksi push/commit baru */
  createWebhook(repo: string, config: WebhookConfig): Promise<WebhookInfo>;
  
  /** Menghapus webhook */
  deleteWebhook(repo: string, webhookId: string): Promise<void>;
}
```

### Deployment Provider Interface
Setiap deployment provider wajib mengimplementasikan interface `DeploymentProvider`:

```typescript
export interface DeploymentProvider {
  /** Memicu proses deployment baru */
  deploy(config: DeployConfig): Promise<DeploymentResult>;
  
  /** Membatalkan deployment yang sedang berjalan */
  cancelDeployment(deploymentId: string): Promise<void>;
  
  /** Mengambil status live deployment saat ini */
  getStatus(deploymentId: string): Promise<DeploymentStatus>;
  
  /** Mengambil logs deployment saat ini */
  getLogs(deploymentId: string): Promise<string>;
}
```

---

## 2. Cara Membuat Provider Baru

Langkah-langkah menambahkan provider baru:

### Langkah 1: Buat Package Baru di Direktori `providers/`
1. Buat folder baru di bawah `providers/` (misalnya `providers/gitlab/`).
2. Buat berkas `package.json` dan pasang dependensi `@hallo/sdk` (sebagai `workspace:*`).
3. Buat berkas `tsconfig.json` yang meng-extend file tsconfig base workspace.

### Langkah 2: Implementasikan Provider Class
Tulis implementasi class yang meng-extend interface yang sesuai dari `@hallo/sdk`.

Contoh implementasi GitLab Repository Provider:

```typescript
import { RepositoryProvider, RepositoryInfo, WebhookConfig, WebhookInfo } from '@hallo/sdk';
import axios from 'axios';

export class GitlabProvider implements RepositoryProvider {
  private client;

  constructor(private readonly config: { token: string; apiUrl?: string }) {
    this.client = axios.create({
      baseURL: config.apiUrl || 'https://gitlab.com/api/v4',
      headers: { 'Private-Token': config.token },
    });
  }

  async getRepositoryInfo(repo: string): Promise<RepositoryInfo> {
    const { data } = await this.client.get(`/projects/${encodeURIComponent(repo)}`);
    return {
      id: data.id.toString(),
      name: data.path_with_namespace,
      url: data.web_url,
      defaultBranch: data.default_branch,
    };
  }

  async getBranches(repo: string): Promise<string[]> {
    const { data } = await this.client.get(`/projects/${encodeURIComponent(repo)}/repository/branches`);
    return data.map((b: any) => b.name);
  }

  async createWebhook(repo: string, config: WebhookConfig): Promise<WebhookInfo> {
    const { data } = await this.client.post(`/projects/${encodeURIComponent(repo)}/hooks`, {
      url: config.url,
      token: config.secret,
      push_events: true,
    });
    return { id: data.id.toString(), url: data.url };
  }

  async deleteWebhook(repo: string, webhookId: string): Promise<void> {
    await this.client.delete(`/projects/${encodeURIComponent(repo)}/hooks/${webhookId}`);
  }
}
```

### Langkah 3: Daftarkan ke `ProviderFactory` di Backend API
Buka berkas `apps/api/src/modules/providers/provider.factory.ts`:

1. Impor class provider baru Anda.
2. Tambahkan tipe enum baru di database schema Prisma jika dibutuhkan, lalu lakukan migrasi.
3. Tambahkan kondisi baru di metode `getRepositoryProvider` atau `getDeploymentProvider`:

```typescript
  async getRepositoryProvider(providerId: string): Promise<RepositoryProvider> {
    // ...
    if (connection.type === ProviderType.GITLAB) {
      const config = this.decryptConfig(connection.config);
      return new GitlabProvider({ token: config.token });
    }
    // ...
  }
```

---

## 3. Menjalankan Unit Tests Provider
Pastikan Anda membuat unit tests yang memadai di dalam package provider baru Anda untuk memvalidasi pemanggilan API eksternal (mocking request menggunakan libraries seperti `msw` atau `jest`).
