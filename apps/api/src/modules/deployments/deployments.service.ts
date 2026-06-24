import { Injectable, NotFoundException, BadRequestException, MessageEvent } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TriggerDeployDto } from './dto/deployment.dto';
import { paginateResponse, paginateArgs } from '../../common/helpers/paginate.helper';
import { DeploymentStatus, Prisma } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES, JOB_NAMES } from '@hallo/shared';
import { Observable } from 'rxjs';
import { ProviderFactory } from '../providers/provider.factory';

const CANCELLABLE_STATUSES: DeploymentStatus[] = [
  DeploymentStatus.PENDING,
  DeploymentStatus.BUILDING,
  DeploymentStatus.DEPLOYING,
];

@Injectable()
export class DeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.DEPLOYMENTS) private readonly deployQueue: Queue,
    private readonly providerFactory: ProviderFactory,
  ) {}

  async findAll(
    pagination: { page: number; limit: number; search?: string },
    filters?: {
      status?: DeploymentStatus;
      serviceId?: string;
      environmentId?: string;
      startDate?: string;
      endDate?: string;
      projectId?: string;
    },
  ) {
    const where: Prisma.DeploymentWhereInput = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.serviceId) where.serviceId = filters.serviceId;
    if (filters?.environmentId) where.environmentId = filters.environmentId;

    if (filters?.projectId) {
      where.service = { projectId: filters.projectId };
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    if (pagination.search) {
      where.OR = [
        { branch: { contains: pagination.search, mode: 'insensitive' } },
        { commitMsg: { contains: pagination.search, mode: 'insensitive' } },
        { commitSha: { contains: pagination.search, mode: 'insensitive' } },
        { triggeredBy: { contains: pagination.search, mode: 'insensitive' } },
        { service: { name: { contains: pagination.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.deployment.findMany({
        where,
        ...paginateArgs(pagination),
        orderBy: { createdAt: 'desc' },
        include: {
          service: { select: { id: true, name: true, projectId: true } },
          environment: { select: { id: true, name: true } },
        },
      }),
      this.prisma.deployment.count({ where }),
    ]);

    return paginateResponse(items, total, pagination);
  }

  async findByService(serviceId: string, pagination: { page: number; limit: number }) {
    const [items, total] = await Promise.all([
      this.prisma.deployment.findMany({
        where: { serviceId },
        ...paginateArgs(pagination),
        orderBy: { createdAt: 'desc' },
        include: { environment: { select: { id: true, name: true } } },
      }),
      this.prisma.deployment.count({ where: { serviceId } }),
    ]);
    return paginateResponse(items, total, pagination);
  }

  async findOne(id: string) {
    const deployment = await this.prisma.deployment.findUnique({
      where: { id },
      include: {
        service: { select: { id: true, name: true, branch: true } },
        environment: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true, type: true } },
      },
    });
    if (!deployment) throw new NotFoundException(`Deployment ${id} not found`);
    return deployment;
  }

  async triggerDeploy(serviceId: string, dto: TriggerDeployDto, triggeredBy: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { repository: true },
    });
    if (!service) throw new NotFoundException(`Service ${serviceId} not found`);

    const environment = await this.prisma.environment.findUnique({
      where: { id: dto.environmentId },
    });
    if (!environment) throw new NotFoundException(`Environment ${dto.environmentId} not found`);

    const provider = await this.prisma.providerConnection.findUnique({
      where: { id: dto.providerId },
    });
    if (!provider) throw new NotFoundException(`Provider ${dto.providerId} not found`);

    const deployment = await this.prisma.deployment.create({
      data: {
        serviceId,
        environmentId: dto.environmentId,
        providerId: dto.providerId,
        status: DeploymentStatus.PENDING,
        branch: dto.branch ?? service.branch,
        commitSha: dto.commitSha,
        triggeredBy,
      },
    });

    await this.deployQueue.add(
      JOB_NAMES.DEPLOY_SERVICE,
      { deploymentId: deployment.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, timeout: 600_000 },
    );

    return deployment;
  }

  async cancel(id: string) {
    const deployment = await this.findOne(id);

    if (!CANCELLABLE_STATUSES.includes(deployment.status)) {
      throw new BadRequestException(`Cannot cancel deployment with status ${deployment.status}`);
    }

    if (deployment.externalId && deployment.providerId) {
      try {
        const provider = await this.providerFactory.getDeploymentProvider(deployment.providerId);
        if (provider.cancel) {
          await provider.cancel(deployment.externalId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Failed to cancel deployment on provider: ${message}`);
      }
    }

    const completedAt = new Date();
    const duration = deployment.startedAt
      ? Math.round((completedAt.getTime() - deployment.startedAt.getTime()) / 1000)
      : null;

    return this.prisma.deployment.update({
      where: { id },
      data: {
        status: DeploymentStatus.CANCELLED,
        completedAt,
        duration,
      },
    });
  }

  streamLogs(id: string): Observable<MessageEvent> {
    let sentLength = 0;

    return new Observable<MessageEvent>((subscriber) => {
      const poll = async () => {
        try {
          const deployment = await this.prisma.deployment.findUnique({
            where: { id },
            select: { logs: true, status: true },
          });

          if (!deployment) {
            subscriber.next({ data: { logs: '', status: 'FAILED' } });
            subscriber.complete();
            return;
          }

          const logs = deployment.logs ?? '';
          const newLogs = logs.substring(sentLength);
          sentLength = logs.length;

          subscriber.next({
            data: {
              logs: newLogs,
              status: deployment.status,
            },
          });

          const isTerminal =
            deployment.status === DeploymentStatus.SUCCESS ||
            deployment.status === DeploymentStatus.FAILED ||
            deployment.status === DeploymentStatus.CANCELLED;

          if (isTerminal) {
            subscriber.complete();
            return;
          }
        } catch (error) {
          subscriber.error(error);
        }
      };

      // Run immediately
      poll();

      // Set up interval
      const timer = setInterval(poll, 2000);

      // Clean up on unsubscribe
      return () => {
        clearInterval(timer);
      };
    });
  }
}
