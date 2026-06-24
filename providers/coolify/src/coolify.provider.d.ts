import type { DeploymentProvider } from '@hallo/sdk';
import type { Application, DeployConfig, DeployResult, SdkDeploymentStatus } from '@hallo/sdk';
import type { CoolifyConfig } from './types';
export declare class CoolifyProvider implements DeploymentProvider {
  private readonly client;
  constructor(config: CoolifyConfig);
  listApplications(): Promise<Application[]>;
  deploy(config: DeployConfig): Promise<DeployResult>;
  getStatus(externalId: string): Promise<SdkDeploymentStatus>;
  getLogs(externalId: string): Promise<string>;
  rollback(externalId: string): Promise<void>;
  private mapStatus;
  private mapApplication;
}
//# sourceMappingURL=coolify.provider.d.ts.map
