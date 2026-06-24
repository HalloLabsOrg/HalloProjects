---
id: github
title: GitHub Provider
---

# GitHub Provider

Integrasi dengan GitHub dapat menggunakan dua metode: **GitHub App (Sangat Direkomendasikan)** atau **Personal Access Token (PAT)**.

---

## Opsi 1: GitHub App (Rekomendasi Utama — Tanpa Konfigurasi .env)

Metode ini adalah cara termudah dan paling aman untuk menghubungkan instance self-hosted HALLO Projects dengan GitHub Anda, mendukung **multi-akun** (menghubungkan banyak akun/organisasi personal secara bersamaan) tanpa harus menyentuh file konfigurasi `.env` server.

### Langkah-langkah:

1. Buka **Providers** di Dashboard HALLO Projects.
2. Klik tombol **Connect GitHub**.
3. Di tab **GitHub App (No-env)**, klik **Create GitHub App Connection**.
4. Anda akan diarahkan ke halaman pembuatan GitHub App di akun GitHub Anda (kredensial callback dan webhook telah diformulasikan secara otomatis).
5. Beri nama aplikasi Anda (misalnya `HALLO Projects Instance`), lalu klik **Create GitHub App**.
6. Setelah selesai, GitHub secara otomatis menyimpan kredensial (App ID, Secret, Private Key) kembali ke database dan mengarahkan Anda kembali ke Dashboard.
7. Di Dashboard, klik tombol **Connect / Install on Account** untuk mengaktifkan aplikasi pada akun personal atau organisasi Anda dan memilih repositori mana yang ingin Anda sinkronkan.

---

## Opsi 2: Personal Access Token (PAT)

Jika Anda tidak dapat menggunakan GitHub App atau ingin menggunakan token akses statis tradisional:

### 1. Generate Personal Access Token

1. Buka [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Generate new token (classic)
3. Pilih scopes:
   - `repo` — full repo access
   - `admin:repo_hook` — untuk register webhook otomatis
4. Copy token

### 2. Connect di HALLO Projects

Buka **Providers → Add Provider → GitHub**, pilih tab **PAT**, lalu isi:

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
