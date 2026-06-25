import { SdkRepository, Branch, Commit, WebhookConfig, Webhook, RepositoryFile } from '../types';

export interface RepositoryProvider {
  listRepositories(): Promise<SdkRepository[]>;
  getRepository(externalId: string): Promise<SdkRepository>;
  getBranches(repositoryExternalId: string): Promise<Branch[]>;
  getCommit(repositoryExternalId: string, branch: string): Promise<Commit>;
  registerWebhook(repositoryExternalId: string, config: WebhookConfig): Promise<Webhook>;
  validateWebhookSignature(payload: Buffer, signature: string): boolean;
  createBranch(repositoryExternalId: string, name: string, fromBranch: string): Promise<Branch>;
  getTree(repositoryExternalId: string, branch: string): Promise<RepositoryFile[]>;
}
