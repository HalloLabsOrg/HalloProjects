import { createHmac, timingSafeEqual } from 'crypto';
import { Octokit } from '@octokit/rest';
import type { RepositoryProvider } from '@hallo/sdk';
import type {
  SdkRepository,
  Branch,
  Commit,
  WebhookConfig,
  Webhook,
  RepositoryFile,
} from '@hallo/sdk';
import type { GithubConfig } from './types';

export class GithubProvider implements RepositoryProvider {
  private readonly octokit: Octokit;
  private readonly config: GithubConfig;

  constructor(config: GithubConfig) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.token });
  }

  async listRepositories(): Promise<SdkRepository[]> {
    const repos: SdkRepository[] = [];
    let page = 1;
    const isInstallationToken = this.config.token?.startsWith('ghs_');

    while (true) {
      if (isInstallationToken) {
        const { data } = await this.octokit.apps.listReposAccessibleToInstallation({
          per_page: 100,
          page,
        });

        if (!data.repositories || data.repositories.length === 0) break;

        for (const repo of data.repositories) {
          repos.push(this.mapRepo(repo));
        }

        if (data.repositories.length < 100) break;
      } else {
        const { data } = await this.octokit.repos.listForAuthenticatedUser({
          per_page: 100,
          page,
          sort: 'updated',
        });

        if (data.length === 0) break;

        for (const repo of data) {
          repos.push(this.mapRepo(repo));
        }

        if (data.length < 100) break;
      }
      page++;
    }

    return repos;
  }

  async getRepository(externalId: string): Promise<SdkRepository> {
    const [owner, repo] = externalId.split('/');
    const { data } = await this.octokit.repos.get({ owner, repo });
    return this.mapRepo(data);
  }

  async getBranches(repositoryExternalId: string): Promise<Branch[]> {
    const [owner, repo] = repositoryExternalId.split('/');
    const { data: repoData } = await this.octokit.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    const branches: Branch[] = [];
    let page = 1;

    while (true) {
      const { data } = await this.octokit.repos.listBranches({ owner, repo, per_page: 100, page });
      if (data.length === 0) break;

      for (const branch of data) {
        branches.push({
          name: branch.name,
          sha: branch.commit.sha,
          isDefault: branch.name === defaultBranch,
        });
      }

      if (data.length < 100) break;
      page++;
    }

    return branches;
  }

  async getCommit(repositoryExternalId: string, branch: string): Promise<Commit> {
    const [owner, repo] = repositoryExternalId.split('/');
    const { data } = await this.octokit.repos.getCommit({ owner, repo, ref: branch });

    return {
      sha: data.sha,
      message: data.commit.message,
      authorName: data.commit.author?.name ?? 'Unknown',
      authorEmail: data.commit.author?.email ?? '',
      committedAt: new Date(data.commit.author?.date ?? Date.now()),
      url: data.html_url,
    };
  }

  async registerWebhook(repositoryExternalId: string, config: WebhookConfig): Promise<Webhook> {
    const [owner, repo] = repositoryExternalId.split('/');

    const { data } = await this.octokit.repos.createWebhook({
      owner,
      repo,
      name: 'web',
      active: true,
      events: config.events,
      config: {
        url: config.url,
        content_type: 'json',
        secret: config.secret,
        insecure_ssl: '0',
      },
    });

    return {
      id: String(data.id),
      url: data.config.url ?? config.url,
      active: data.active,
    };
  }

  validateWebhookSignature(payload: Buffer, signature: string): boolean {
    if (!this.config.webhookSecret) return false;

    const expectedSig = `sha256=${createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex')}`;

    const actualBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);

    if (actualBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(actualBuf, expectedBuf);
  }

  async createBranch(
    repositoryExternalId: string,
    name: string,
    fromBranch: string,
  ): Promise<Branch> {
    const [owner, repo] = repositoryExternalId.split('/');

    // 1. Get SHA of the base branch
    const { data: refData } = await this.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });
    const sha = refData.object.sha;

    // 2. Create new branch ref
    await this.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${name}`,
      sha,
    });

    return {
      name,
      sha,
      isDefault: false,
    };
  }

  async getTree(repositoryExternalId: string, branch: string): Promise<RepositoryFile[]> {
    const [owner, repo] = repositoryExternalId.split('/');
    const { data } = await this.octokit.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: '1',
    });

    if (!data.tree) return [];

    return data.tree
      .filter((item) => item.path && (item.type === 'blob' || item.type === 'tree'))
      .map((item) => ({
        path: item.path!,
        type: item.type === 'tree' ? 'dir' : 'file',
        size: item.size,
      }));
  }

  private mapRepo(repo: {
    id: number;
    full_name: string;
    name: string;
    html_url: string;
    default_branch: string;
    private: boolean;
    description?: string | null;
  }): SdkRepository {
    return {
      externalId: repo.full_name,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      visibility: repo.private ? 'private' : 'public',
      description: repo.description ?? undefined,
    };
  }
}
