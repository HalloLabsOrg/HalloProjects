import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES, JOB_NAMES } from '@hallo/shared';
import { DeploymentStatus } from '@prisma/client';

interface GithubWebhookJobData {
  repositoryExternalId: string;
  branch: string;
  commitSha: string;
  commitMsg: string;
  authorName: string;
  authorEmail: string;
}

@Processor(QUEUE_NAMES.WEBHOOKS)
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.DEPLOYMENTS) private readonly deployQueue: Queue,
  ) {}

  @Process(JOB_NAMES.PROCESS_GITHUB_WEBHOOK)
  async handleWebhook(job: Job<GithubWebhookJobData>) {
    const { repositoryExternalId, branch, commitSha, commitMsg, authorName } = job.data;
    this.logger.log(
      `Processing push webhook for repository ${repositoryExternalId} on branch ${branch}`,
    );

    const repo = await this.prisma.repository.findFirst({
      where: { externalId: repositoryExternalId },
    });

    if (!repo) {
      this.logger.error(`Repository with externalId ${repositoryExternalId} not found in database`);
      return;
    }

    // Update repository last commit info
    await this.prisma.repository.update({
      where: { id: repo.id },
      data: {
        lastCommitSha: commitSha,
        lastCommitMsg: commitMsg,
        lastCommitAt: new Date(),
        syncedAt: new Date(),
      },
    });

    // Find all services associated with this repository
    const services = await this.prisma.service.findMany({
      where: { repositoryId: repo.id },
    });

    if (services.length === 0) {
      this.logger.log(`No services found for repository ${repo.fullName}`);
      return;
    }

    for (const service of services) {
      // Find matching environments for this service's project where env.branch === branch
      const environments = await this.prisma.environment.findMany({
        where: {
          projectId: service.projectId,
          branch: branch,
          autoDeploy: true,
        },
      });

      if (environments.length === 0) {
        this.logger.log(
          `No active auto-deploy environments found matching branch ${branch} for service ${service.name}`,
        );
        continue;
      }

      for (const env of environments) {
        let providerId: string | null = null;

        // 1. Try to find the last deployment for this service and environment
        const lastDeployment = await this.prisma.deployment.findFirst({
          where: {
            serviceId: service.id,
            environmentId: env.id,
          },
          orderBy: { createdAt: 'desc' },
        });

        if (lastDeployment) {
          providerId = lastDeployment.providerId;
        } else {
          // 2. Fallback to the first active Coolify provider connection
          const fallbackProvider = await this.prisma.providerConnection.findFirst({
            where: { type: 'COOLIFY', isActive: true },
          });
          if (fallbackProvider) {
            providerId = fallbackProvider.id;
          }
        }

        if (!providerId) {
          this.logger.warn(
            `No Coolify provider connection found to trigger auto-deploy for service ${service.name} in environment ${env.name}`,
          );
          continue;
        }

        this.logger.log(
          `Triggering auto-deploy for service ${service.name} on environment ${env.name} using provider ${providerId}`,
        );

        // Create deployment record
        const deployment = await this.prisma.deployment.create({
          data: {
            serviceId: service.id,
            environmentId: env.id,
            providerId,
            status: DeploymentStatus.PENDING,
            branch,
            commitSha,
            commitMsg,
            triggeredBy: `Webhook (${authorName})`,
          },
        });

        // Trigger queue job
        await this.deployQueue.add(
          JOB_NAMES.DEPLOY_SERVICE,
          { deploymentId: deployment.id },
          { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, timeout: 600_000 },
        );
      }
    }
  }
}
