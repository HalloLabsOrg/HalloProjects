import type { RepositoryProvider } from '@hallo/sdk';
import type { SdkRepository, Branch, Commit, WebhookConfig, Webhook } from '@hallo/sdk';
import type { GithubConfig } from './types';
export declare class GithubProvider implements RepositoryProvider {
  private readonly octokit;
  private readonly config;
  constructor(config: GithubConfig);
  listRepositories(): Promise<SdkRepository[]>;
  getRepository(externalId: string): Promise<SdkRepository>;
  getBranches(repositoryExternalId: string): Promise<Branch[]>;
  getCommit(repositoryExternalId: string, branch: string): Promise<Commit>;
  registerWebhook(repositoryExternalId: string, config: WebhookConfig): Promise<Webhook>;
  validateWebhookSignature(payload: Buffer, signature: string): boolean;
  private mapRepo;
}
//# sourceMappingURL=github.provider.d.ts.map
