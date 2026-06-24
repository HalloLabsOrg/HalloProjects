import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TriggerDeployDto } from './dto/deployment.dto';
import { paginateResponse, paginateArgs } from '../../common/helpers/paginate.helper';
import { DeploymentStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES, JOB_NAMES } from '@hallo/shared';

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
  ) {}

  async findAll(
    pagination: { page: number; limit: number; search?: string },
    filters?: { status?: DeploymentStatus; serviceId?: string },
  ) {
    const where: Record<string, unknown> = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.serviceId) where.serviceId = filters.serviceId;

    const [items, total] = await Promise.all([
      this.prisma.deployment.findMany({
        where,
        ...paginateArgs(pagination),
        orderBy: { createdAt: 'desc' },
        include: {
          service: { select: { id: true, name: true } },
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

    return this.prisma.deployment.update({
      where: { id },
      data: { status: DeploymentStatus.CANCELLED, completedAt: new Date() },
    });
  }
}
