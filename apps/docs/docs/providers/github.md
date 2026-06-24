---
id: github
title: GitHub Provider
---

# GitHub Provider

Integrasi dengan GitHub menggunakan Personal Access Token (PAT).

## Setup

### 1. Generate Personal Access Token

1. Buka [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Generate new token (classic)
3. Pilih scopes:
   - `repo` — full repo access
   - `admin:repo_hook` — untuk register webhook otomatis
4. Copy token

### 2. Connect di HALLO Projects

Buka **Providers → Add Provider → GitHub**, isi:

| Field                 | Value                                         |
| --------------------- | --------------------------------------------- |
| Name                  | Nama deskriptif, e.g. "GitHub - HALLO Labs"   |
| Personal Access Token | Token dari langkah 1                          |
| Organization          | (Opsional) nama org untuk filter repositories |

Klik **Test Connection** untuk verifikasi, lalu **Save**.

## Implementation

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

  async getBranches(repoFullName: string): Promise<Branch[]> {
    const [owner, repo] = repoFullName.split('/');
    const { data } = await this.octokit.repos.listBranches({ owner, repo });
    return data.map((b) => ({ name: b.name, sha: b.commit.sha }));
  }

  validateWebhookSignature(payload: Buffer, signature: string): boolean {
    const hmac = createHmac('sha256', this.config.webhookSecret);
    const digest = `sha256=${hmac.update(payload).digest('hex')}`;
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  }
}
```

## Webhook

Webhook di-register otomatis ke setiap repository saat sync. URL: `https://your-domain/api/webhooks/github`

Jika perlu register manual, lihat [Webhooks Module](/docs/modules/webhooks).
