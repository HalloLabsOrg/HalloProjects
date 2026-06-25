import axios, { AxiosInstance } from 'axios';
import type { DeploymentProvider } from '@hallo/sdk';
import type { Application, DeployConfig, DeployResult, SdkDeploymentStatus } from '@hallo/sdk';
import type { CoolifyConfig } from './types';

const COOLIFY_STATUS_MAP: Record<string, SdkDeploymentStatus> = {
  // Container statuses
  running: 'SUCCESS',
  stopped: 'FAILED',
  exited: 'FAILED',
  restarting: 'DEPLOYING',
  starting: 'BUILDING',
  removing: 'CANCELLED',

  // Deployment statuses (from GET /api/v1/deployments/{uuid})
  queued: 'PENDING',
  in_progress: 'BUILDING',
  success: 'SUCCESS',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
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

    const { data } = await this.client.post<CoolifyDeployResponse>(
      `/api/v1/deploy?uuid=${config.applicationUuid}&force=${config.force ?? false}`,
    );

    const firstDeployment = data.deployments?.[0];
    if (!firstDeployment || !firstDeployment.deployment_uuid) {
      throw new Error(
        firstDeployment?.message || 'Gagal memulai deployment di Coolify: UUID tidak didapatkan'
      );
    }

    return { externalId: firstDeployment.deployment_uuid };
  }

  async getStatus(externalId: string): Promise<SdkDeploymentStatus> {
    const { data } = await this.client.get<CoolifyDeployment>(`/api/v1/deployments/${externalId}`);
    return this.mapStatus(data.status);
  }

  async getLogs(externalId: string): Promise<string> {
    const { data } = await this.client.get<CoolifyDeployment>(
      `/api/v1/deployments/${externalId}`,
    );
    return data.logs ?? '';
  }

  async rollback(externalId: string): Promise<void> {
    await this.client.post(`/api/v1/deployments/${externalId}/restart`);
  }

  async cancel(externalId: string): Promise<void> {
    await this.client.post(`/api/v1/deployments/${externalId}/stop`);
  }

  async listServers(): Promise<any[]> {
    const { data } = await this.client.get<any[]>('/api/v1/servers');
    return data;
  }

  async listProjects(): Promise<any[]> {
    const { data } = await this.client.get<any[]>('/api/v1/projects');
    return data;
  }

  async getProject(uuid: string): Promise<any> {
    const { data } = await this.client.get<any>(`/api/v1/projects/${uuid}`);
    return data;
  }

  async createProject(payload: { name: string; description?: string }): Promise<any> {
    const { data } = await this.client.post<any>('/api/v1/projects', payload);
    return data;
  }

  async listSources(): Promise<any[]> {
    const { data } = await this.client.get<any[]>('/api/v1/sources');
    return data;
  }

  async createApplication(payload: {
    name: string;
    projectUuid: string;
    environmentName: string;
    serverUuid: string;
    gitRepository: string;
    gitBranch: string;
    githubAppUuid?: string;
    buildPack?: string;
    portsExposes?: string;
    dockerfilePath?: string;
    baseDirectory?: string;
  }): Promise<any> {
    const isPrivate = !!payload.githubAppUuid;
    const endpoint = isPrivate
      ? '/api/v1/applications/private-github-app'
      : '/api/v1/applications/public';

    const body: Record<string, any> = {
      name: payload.name,
      project_uuid: payload.projectUuid,
      environment_name: payload.environmentName,
      server_uuid: payload.serverUuid,
      git_repository: payload.gitRepository,
      git_branch: payload.gitBranch,
      build_pack: payload.buildPack ?? 'nixpacks',
      ports_exposes: payload.portsExposes ?? '3000',
    };

    if (payload.dockerfilePath) {
      body.dockerfile_location = payload.dockerfilePath;
    }
    if (payload.baseDirectory) {
      body.base_directory = payload.baseDirectory;
    }

    if (isPrivate) {
      body.github_app_uuid = payload.githubAppUuid;
    }

    const { data } = await this.client.post<any>(endpoint, body);
    return data;
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
      gitRepository: app.git_repository ?? undefined,
      gitBranch: app.git_branch ?? undefined,
    };
  }
}

interface CoolifyApplication {
  uuid: string;
  name: string;
  fqdn?: string;
  status: string;
  git_repository?: string;
  git_branch?: string;
}

interface CoolifyDeployment {
  uuid: string;
  status: string;
  logs?: string;
}

interface CoolifyDeployResponse {
  deployments: Array<{
    message: string;
    resource_uuid: string;
    deployment_uuid?: string;
  }>;
}
