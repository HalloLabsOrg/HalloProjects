import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderFactory } from '../providers/provider.factory';
import { ParsePaginationPipe } from '../../common/pipes/parse-pagination.pipe';
import { paginateResponse, paginateArgs } from '../../common/helpers/paginate.helper';

type PaginationQuery = InstanceType<typeof ParsePaginationPipe> extends Promise<infer T> ? T : never;

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ProviderFactory,
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

  async getBranches(id: string) {
    const repo = await this.findOne(id);
    const provider = await this.providerFactory.getRepositoryProvider(repo.providerId);
    return provider.getBranches(repo.externalId);
  }

  async sync(providerId?: string) {
    const where = providerId ? { id: providerId } : {};
    const providers = await this.prisma.providerConnection.findMany({
      where: { ...where, type: 'GITHUB', isActive: true },
    });

    const results: { providerId: string; synced: number; errors: string[] }[] = [];

    for (const connection of providers) {
      const errors: string[] = [];
      let synced = 0;

      try {
        const githubProvider = await this.providerFactory.getRepositoryProvider(connection.id);
        const repos = await githubProvider.listRepositories();

        for (const repo of repos) {
          try {
            await this.prisma.repository.upsert({
              where: { providerId_externalId: { providerId: connection.id, externalId: repo.externalId } },
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
          } catch (err: unknown) {
            errors.push(`${repo.fullName}: ${err instanceof Error ? err.message : 'unknown error'}`);
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
