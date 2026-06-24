export interface SdkRepository {
  externalId: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  visibility: 'public' | 'private';
  description?: string;
}
export interface Branch {
  name: string;
  sha: string;
  isDefault: boolean;
}
export interface Commit {
  sha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  committedAt: Date;
  url: string;
}
export interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
}
export interface Webhook {
  id: string;
  url: string;
  active: boolean;
}
export interface DeployConfig {
  applicationUuid: string;
  branch: string;
  commitSha?: string;
  force?: boolean;
  environmentVariables?: Record<string, string>;
}
export interface DeployResult {
  externalId: string;
}
export type SdkDeploymentStatus =
  | 'PENDING'
  | 'BUILDING'
  | 'DEPLOYING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';
export interface Application {
  uuid: string;
  name: string;
  fqdn?: string;
  status: string;
}
//# sourceMappingURL=index.d.ts.map
