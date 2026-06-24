import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderFactory } from '../providers/provider.factory';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES, JOB_NAMES } from '@hallo/shared';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ProviderFactory,
    @InjectQueue(QUEUE_NAMES.WEBHOOKS) private readonly webhooksQueue: Queue,
  ) {}

  async processGithubWebhook(event: string, signature: string, rawBody: Buffer, body: any) {
    if (event === 'ping') {
      return { ok: true };
    }

    if (event !== 'push') {
      return { ignored: true };
    }

    const repoFullName = body.repository?.full_name;
    if (!repoFullName) {
      throw new BadRequestException('Repository full_name missing in payload');
    }

    const repo = await this.prisma.repository.findFirst({
      where: { fullName: repoFullName },
    });

    if (!repo) {
      throw new BadRequestException(`Repository ${repoFullName} not found`);
    }

    // Verify signature
    const provider = await this.providerFactory.getRepositoryProvider(repo.providerId);
    const isValid = provider.validateWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Extract push details
    const ref = body.ref;
    if (!ref) {
      return { ok: true, message: 'No ref found in push payload' };
    }

    const branch = ref.replace('refs/heads/', '');
    const commitSha = body.head_commit?.id ?? body.after;
    const commitMsg = body.head_commit?.message ?? 'No commit message';
    const authorName = body.head_commit?.author?.name ?? body.pusher?.name ?? 'Unknown';
    const authorEmail = body.head_commit?.author?.email ?? body.pusher?.email ?? '';

    // Add to queue
    await this.webhooksQueue.add(
      JOB_NAMES.PROCESS_GITHUB_WEBHOOK,
      {
        repositoryExternalId: repo.externalId,
        branch,
        commitSha,
        commitMsg,
        authorName,
        authorEmail,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    return { queued: true };
  }
}
