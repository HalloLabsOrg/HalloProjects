import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderFactory } from '../providers/provider.factory';
import { paginateResponse, paginateArgs } from '../../common/helpers/paginate.helper';
import { EncryptionService } from '../../common/encryption/encryption.service';

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ProviderFactory,
    private readonly encryption: EncryptionService,
  ) {}

  async findAll(pagination: { page: number; limit: number; search?: string }) {
    const where = pagination.search
      ? {
          OR: [
            { name: { contains: pagination.search, mode: 'insensitive' as const } },
            { fullName: { contains: pagination.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.repository.findMany({
        where,
        ...paginateArgs(pagination),
        orderBy: { updatedAt: 'desc' },
        include: { provider: { select: { id: true, name: true, type: true } } },
      }),
      this.prisma.repository.count({ where }),
    ]);

    return paginateResponse(items, total, pagination);
  }

  async findOne(id: string) {
    const repo = await this.prisma.repository.findUnique({
      where: { id },
      include: { provider: { select: { id: true, name: true, type: true } } },
    });
    if (!repo) throw new NotFoundException(`Repository ${id} not found`);
    return repo;
  }

  async delete(id: string) {
    await this.findOne(id);

    const serviceCount = await this.prisma.service.count({
      where: { repositoryId: id },
    });

    if (serviceCount > 0) {
      throw new BadRequestException(
        'Cannot delete repository because it is actively used by one or more services.',
      );
    }

    return this.prisma.repository.delete({
      where: { id },
    });
  }

  async getBranches(id: string) {
    const repo = await this.findOne(id);
    const provider = await this.providerFactory.getRepositoryProvider(repo.providerId);
    return provider.getBranches(repo.externalId);
  }

  async createBranch(id: string, name: string, fromBranch: string) {
    const repo = await this.findOne(id);
    const provider = await this.providerFactory.getRepositoryProvider(repo.providerId);
    return provider.createBranch(repo.externalId, name, fromBranch);
  }

  async getRemoteRepositories(providerId: string): Promise<any[]> {
    const connection = await this.prisma.providerConnection.findUnique({
      where: { id: providerId, type: 'GITHUB', isActive: true },
    });
    if (!connection) {
      throw new NotFoundException(`Active GitHub provider ${providerId} not found`);
    }
    const config = this.decryptConfig(connection.config as Record<string, string>);
    if (config.authMethod === 'github_app') {
      return [];
    }

    const githubProvider = await this.providerFactory.getRepositoryProvider(providerId);
    return githubProvider.listRepositories();
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

  async sync(providerId?: string, externalIds?: string[]) {
    const where = providerId ? { id: providerId } : {};
    const providers = await this.prisma.providerConnection.findMany({
      where: { ...where, type: 'GITHUB', isActive: true },
    });

    const results: { providerId: string; synced: number; errors: string[] }[] = [];

    for (const connection of providers) {
      const config = this.decryptConfig(connection.config as Record<string, string>);
      if (config.authMethod === 'github_app') {
        // Skip root GitHub App connection as it does not own repositories
        continue;
      }

      const errors: string[] = [];
      let synced = 0;

      try {
        const githubProvider = await this.providerFactory.getRepositoryProvider(connection.id);
        const repos = await githubProvider.listRepositories();

        for (const repo of repos) {
          if (externalIds && !externalIds.includes(repo.externalId)) {
            continue;
          }
          try {
            await this.prisma.repository.upsert({
              where: {
                providerId_externalId: { providerId: connection.id, externalId: repo.externalId },
              },
              update: {
                name: repo.name,
                fullName: repo.fullName,
                url: repo.url,
                defaultBranch: repo.defaultBranch,
                visibility: repo.visibility,
                syncedAt: new Date(),
              },
              create: {
                providerId: connection.id,
                externalId: repo.externalId,
                name: repo.name,
                fullName: repo.fullName,
                url: repo.url,
                defaultBranch: repo.defaultBranch,
                visibility: repo.visibility,
                syncedAt: new Date(),
              },
            });
            synced++;

            // Register webhook to GitHub automatically
            const domain = process.env.DOMAIN || 'localhost:4000';
            const webhookUrl = domain.startsWith('http')
              ? `${domain}/api/webhooks/github`
              : `https://${domain}/api/webhooks/github`;

            const decryptedConfig = this.decryptConfig(connection.config as Record<string, string>);
            const webhookSecret =
              decryptedConfig.webhookSecret ||
              process.env.GITHUB_WEBHOOK_SECRET ||
              'hallo-webhook-secret';

            await githubProvider
              .registerWebhook(repo.externalId, {
                url: webhookUrl,
                secret: webhookSecret,
                events: ['push', 'pull_request'],
              })
              .catch((err: Error) => {
                // Ignore already exists error, otherwise log in results
                if (!err.message?.includes('already exists')) {
                  errors.push(`Webhook registration failed for ${repo.fullName}: ${err.message}`);
                }
              });
          } catch (err: unknown) {
            errors.push(
              `${repo.fullName}: ${err instanceof Error ? err.message : 'unknown error'}`,
            );
          }
        }
      } catch (err: unknown) {
        errors.push(err instanceof Error ? err.message : 'Failed to fetch repositories');
      }

      results.push({ providerId: connection.id, synced, errors });
    }

    return { results };
  }
}
