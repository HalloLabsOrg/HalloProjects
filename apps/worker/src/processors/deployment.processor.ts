import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { CoolifyProvider } from '@hallo/coolify-provider';
import { DeploymentStatus } from '@prisma/client';
import { QUEUE_NAMES, JOB_NAMES } from '@hallo/shared';

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 120; // 10 minutes

@Processor(QUEUE_NAMES.DEPLOYMENTS)
export class DeploymentProcessor {
  private readonly logger = new Logger(DeploymentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  @Process(JOB_NAMES.DEPLOY_SERVICE)
  async handleDeploy(job: Job<{ deploymentId: string }>) {
    const { deploymentId } = job.data;
    this.logger.log(`Processing deployment ${deploymentId}`);

    const deployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: {
        service: { include: { repository: true } },
        provider: true,
      },
    });

    if (!deployment) {
      this.logger.error(`Deployment ${deploymentId} not found`);
      return;
    }

    if (deployment.status === DeploymentStatus.CANCELLED) {
      this.logger.log(`Deployment ${deploymentId} was cancelled before processing`);
      return;
    }

    await this.updateStatus(deploymentId, DeploymentStatus.BUILDING);

    try {
      const provider = this.getCoolifyProvider(deployment.provider);

      const config = this.decryptConfig(deployment.provider.config as Record<string, string>);
      const coolify = new CoolifyProvider({ apiUrl: config.apiUrl, apiToken: config.apiToken });

      const { externalId } = await coolify.deploy({
        applicationUuid: deployment.service.repository?.externalId ?? deployment.serviceId,
        branch: deployment.branch,
        commitSha: deployment.commitSha ?? undefined,
        force: false,
      });

      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: { externalId, status: DeploymentStatus.DEPLOYING, startedAt: new Date() },
      });

      // Poll until terminal state
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await sleep(POLL_INTERVAL_MS);

        const current = await this.prisma.deployment.findUnique({ where: { id: deploymentId } });
        if (current?.status === DeploymentStatus.CANCELLED) {
          this.logger.log(`Deployment ${deploymentId} cancelled during polling`);
          return;
        }

        const status = await coolify.getStatus(externalId);
        const logs = await coolify.getLogs(externalId).catch(() => '');

        await this.prisma.deployment.update({
          where: { id: deploymentId },
          data: {
            status: status as DeploymentStatus,
            logs: logs || undefined,
          },
        });

        if (status === 'SUCCESS' || status === 'FAILED' || status === 'CANCELLED') {
          await this.prisma.deployment.update({
            where: { id: deploymentId },
            data: { completedAt: new Date() },
          });
          this.logger.log(`Deployment ${deploymentId} finished with status ${status}`);
          return;
        }
      }

      // Timeout
      await this.updateStatus(deploymentId, DeploymentStatus.FAILED, 'Deployment timed out');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Deployment ${deploymentId} failed: ${message}`);
      await this.updateStatus(deploymentId, DeploymentStatus.FAILED, message);
      throw err;
    }
  }

  private async updateStatus(deploymentId: string, status: DeploymentStatus, logs?: string) {
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status,
        ...(logs ? { logs } : {}),
        ...(status === DeploymentStatus.FAILED ? { completedAt: new Date() } : {}),
      },
    });
  }

  private getCoolifyProvider(provider: { config: unknown }) {
    const config = this.decryptConfig(provider.config as Record<string, string>);
    return new CoolifyProvider({ apiUrl: config.apiUrl, apiToken: config.apiToken });
  }

  private decryptConfig(config: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      try {
        result[key] = this.encryption.decrypt(value);
      } catch {
        result[key] = value;
      }
    }
    return result;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
