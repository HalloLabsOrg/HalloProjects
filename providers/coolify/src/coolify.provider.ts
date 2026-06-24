import axios, { AxiosInstance } from 'axios';
import type { DeploymentProvider } from '@hallo/sdk';
import type { Application, DeployConfig, DeployResult, SdkDeploymentStatus } from '@hallo/sdk';
import type { CoolifyConfig } from './types';

const COOLIFY_STATUS_MAP: Record<string, SdkDeploymentStatus> = {
  running: 'SUCCESS',
  stopped: 'FAILED',
  exited: 'FAILED',
  restarting: 'DEPLOYING',
  starting: 'BUILDING',
  removing: 'CANCELLED',
};

export class CoolifyProvider implements DeploymentProvider {
  private readonly client: AxiosInstance;

  constructor(config: CoolifyConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl.replace(/\/$/, ''),
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });
  }

  async listApplications(): Promise<Application[]> {
    const { data } = await this.client.get<CoolifyApplication[]>('/api/v1/applications');
    return data.map(this.mapApplication);
  }

  async deploy(config: DeployConfig): Promise<DeployResult> {
    const payload: Record<string, unknown> = {
      uuid: config.applicationUuid,
      force: config.force ?? false,
    };

    if (config.commitSha) {
      payload.commit_sha = config.commitSha;
    }

    const { data } = await this.client.post<{ deployment_uuid: string }>(
      `/api/v1/deploy?uuid=${config.applicationUuid}&force=${config.force ?? false}`,
    );

    return { externalId: data.deployment_uuid };
  }

  async getStatus(externalId: string): Promise<SdkDeploymentStatus> {
    const { data } = await this.client.get<CoolifyDeployment>(`/api/v1/deployments/${externalId}`);
    return this.mapStatus(data.status);
  }

  async getLogs(externalId: string): Promise<string> {
    const { data } = await this.client.get<{ logs: string }>(
      `/api/v1/deployments/${externalId}/logs`,
    );
    return data.logs ?? '';
  }

  async rollback(externalId: string): Promise<void> {
    await this.client.post(`/api/v1/deployments/${externalId}/restart`);
  }

  async cancel(externalId: string): Promise<void> {
    await this.client.post(`/api/v1/deployments/${externalId}/stop`);
  }

  private mapStatus(coolifyStatus: string): SdkDeploymentStatus {
    return COOLIFY_STATUS_MAP[coolifyStatus?.toLowerCase()] ?? 'PENDING';
  }

  private mapApplication(app: CoolifyApplication): Application {
    return {
      uuid: app.uuid,
      name: app.name,
      fqdn: app.fqdn ?? undefined,
      status: app.status,
    };
  }
}

interface CoolifyApplication {
  uuid: string;
  name: string;
  fqdn?: string;
  status: string;
}

interface CoolifyDeployment {
  uuid: string;
  status: string;
  logs?: string;
}
