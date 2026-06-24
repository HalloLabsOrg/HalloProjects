import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { GithubProvider } from '@hallo/github-provider';
import { QUEUE_NAMES, JOB_NAMES } from '@hallo/shared';

@Processor(QUEUE_NAMES.REPOSITORY_SYNC)
export class RepositorySyncProcessor {
  private readonly logger = new Logger(RepositorySyncProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  @Process(JOB_NAMES.SYNC_REPOSITORY)
  async handleSync(job: Job<{ repositoryId: string }>) {
    const { repositoryId } = job.data;
    this.logger.log(`Syncing repository ${repositoryId}`);

    const repository = await this.prisma.repository.findUnique({
      where: { id: repositoryId },
      include: { provider: true },
    });

    if (!repository) {
      this.logger.error(`Repository ${repositoryId} not found`);
      return;
    }

    try {
      const config = this.decryptConfig(repository.provider.config as Record<string, string>);
      const github = new GithubProvider({
        token: config.token,
        owner: config.owner,
        webhookSecret: config.webhookSecret,
      });

      const commit = await github.getCommit(repository.externalId, repository.defaultBranch);

      await this.prisma.repository.update({
        where: { id: repositoryId },
        data: {
          lastCommitSha: commit.sha,
          lastCommitMsg: commit.message,
          lastCommitAt: commit.committedAt,
          syncedAt: new Date(),
        },
      });

      this.logger.log(`Repository ${repositoryId} synced, latest commit: ${commit.sha.slice(0, 7)}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to sync repository ${repositoryId}: ${message}`);
      throw err;
    }
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
