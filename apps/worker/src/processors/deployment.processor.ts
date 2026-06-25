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
  async handleDeploy(job: Job<{ deploymentId: string; coolifyAppUuid?: string }>) {
    const { deploymentId, coolifyAppUuid } = job.data;
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
      const coolify = this.getCoolifyProvider(deployment.provider);

      let applicationUuid =
        coolifyAppUuid ?? deployment.service.repository?.externalId ?? deployment.serviceId;

      if (!coolifyAppUuid) {
        try {
          const apps = await coolify.listApplications();
          const repoFullName = deployment.service.repository?.fullName;
          const repoName = deployment.service.repository?.name;
          const serviceName = deployment.service.name;
          const serviceSlug = deployment.service.slug;

          // Try to find by git repository first (exact or name match)
          let matchedApp = apps.find((app) => {
            if (!app.gitRepository) return false;
            const appRepoLower = app.gitRepository.toLowerCase();
            return (
              appRepoLower === repoFullName?.toLowerCase() ||
              appRepoLower.endsWith('/' + repoName?.toLowerCase())
            );
          });

          // Try to find by name / slug match
          if (!matchedApp) {
            matchedApp = apps.find((app) => {
              const appNameLower = app.name.toLowerCase();
              return (
                appNameLower === serviceName.toLowerCase() ||
                appNameLower === serviceSlug.toLowerCase() ||
                appNameLower.includes(serviceName.toLowerCase()) ||
                appNameLower.includes(serviceSlug.toLowerCase())
              );
            });
          }

          if (matchedApp) {
            this.logger.log(
              `Resolved Coolify Application UUID to ${matchedApp.uuid} (${matchedApp.name})`,
            );
            applicationUuid = matchedApp.uuid;
          } else {
            throw new Error(
              `Aplikasi Coolify tidak ditemukan. Silakan buat aplikasi baru terlebih dahulu dengan mencentang 'Buat Aplikasi Baru secara Otomatis' di panel deploy.`
            );
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes('Aplikasi Coolify tidak ditemukan')) {
            throw err;
          }
          this.logger.error(
            `Failed to list Coolify applications for dynamic resolution: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }

      const { externalId } = await coolify.deploy({
        applicationUuid,
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
          const completedAt = new Date();
          const duration = current?.startedAt
            ? Math.round((completedAt.getTime() - current.startedAt.getTime()) / 1000)
            : null;

          await this.prisma.deployment.update({
            where: { id: deploymentId },
            data: { completedAt, duration },
          });
          this.logger.log(`Deployment ${deploymentId} finished with status ${status}`);
          return;
        }
      }

      // Timeout
      await this.updateStatus(deploymentId, DeploymentStatus.FAILED, 'Deployment timed out');
    } catch (err: unknown) {
      let message = err instanceof Error ? err.message : 'Unknown error';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as any).response;
        if (response && response.status === 404) {
          message = `Request failed with status code 404. Make sure you have created an application in Coolify that matches this service's repository name ("${deployment.service.repository?.name}") or name ("${deployment.service.name}").`;
        }
      }
      this.logger.error(`Deployment ${deploymentId} failed: ${message}`);
      await this.updateStatus(deploymentId, DeploymentStatus.FAILED, message);
      throw err;
    }
  }

  private async updateStatus(deploymentId: string, status: DeploymentStatus, logs?: string) {
    const deployment = await this.prisma.deployment.findUnique({ where: { id: deploymentId } });
    const completedAt =
      status === DeploymentStatus.FAILED ||
      status === DeploymentStatus.SUCCESS ||
      status === DeploymentStatus.CANCELLED
        ? new Date()
        : null;

    const duration =
      completedAt && deployment?.startedAt
        ? Math.round((completedAt.getTime() - deployment.startedAt.getTime()) / 1000)
        : null;

    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status,
        ...(logs ? { logs } : {}),
        ...(completedAt ? { completedAt, duration } : {}),
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
