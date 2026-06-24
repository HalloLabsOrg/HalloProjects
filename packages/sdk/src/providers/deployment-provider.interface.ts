import { DeployConfig, DeployResult, SdkDeploymentStatus, Application } from '../types';

export interface DeploymentProvider {
  listApplications(): Promise<Application[]>;
  deploy(config: DeployConfig): Promise<DeployResult>;
  getStatus(externalId: string): Promise<SdkDeploymentStatus>;
  getLogs(externalId: string): Promise<string>;
  rollback(externalId: string): Promise<void>;
  cancel?(externalId: string): Promise<void>;
}
