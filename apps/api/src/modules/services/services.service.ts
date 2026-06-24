import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string) {
    await this.ensureProjectExists(projectId);
    return this.prisma.service.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: {
        repository: { select: { id: true, name: true, fullName: true } },
        _count: { select: { deployments: true } },
      },
    });
  }

  async findOne(projectId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, projectId },
      include: {
        repository: { select: { id: true, name: true, fullName: true } },
        _count: { select: { deployments: true } },
      },
    });
    if (!service) throw new NotFoundException(`Service ${id} not found in project ${projectId}`);
    return service;
  }

  async create(projectId: string, dto: CreateServiceDto) {
    await this.ensureProjectExists(projectId);
    await this.ensureRepositoryExists(dto.repositoryId);

    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return this.prisma.service.create({
      data: {
        projectId,
        repositoryId: dto.repositoryId,
        name: dto.name,
        slug,
        branch: dto.branch ?? 'main',
      },
      include: { repository: { select: { id: true, name: true, fullName: true } } },
    });
  }

  async update(projectId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(projectId, id);
    return this.prisma.service.update({
      where: { id },
      data: dto,
    });
  }

  async remove(projectId: string, id: string) {
    await this.findOne(projectId, id);
    await this.prisma.service.delete({ where: { id } });
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
  }

  private async ensureRepositoryExists(repositoryId: string) {
    const repository = await this.prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repository) throw new NotFoundException(`Repository ${repositoryId} not found`);
  }
}
