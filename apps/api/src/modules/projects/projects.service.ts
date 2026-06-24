import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { paginateResponse, paginateArgs } from '../../common/helpers/paginate.helper';
import { ProjectStatus } from '@prisma/client';
import { DEFAULT_ENVIRONMENTS } from '@hallo/shared';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: { page: number; limit: number; search?: string }) {
    const where = pagination.search
      ? {
          OR: [
            { name: { contains: pagination.search, mode: 'insensitive' as const } },
            { slug: { contains: pagination.search, mode: 'insensitive' as const } },
          ],
          status: { not: ProjectStatus.ARCHIVED },
        }
      : { status: { not: ProjectStatus.ARCHIVED } };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        ...paginateArgs(pagination),
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { services: true } } },
      }),
      this.prisma.project.count({ where }),
    ]);

    return paginateResponse(items, total, pagination);
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        environments: { orderBy: { createdAt: 'asc' } },
        _count: { select: { services: true } },
      },
    });
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return project;
  }

  async create(dto: CreateProjectDto, createdById: string) {
    const slug = await this.generateUniqueSlug(dto.name);

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        status: ProjectStatus.ACTIVE,
        createdById,
        environments: {
          create: DEFAULT_ENVIRONMENTS.map((name) => ({
            name,
            slug: name.toLowerCase(),
          })),
        },
      },
      include: { environments: true },
    });

    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async archive(id: string) {
    await this.findOne(id);
    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.ARCHIVED },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.project.delete({ where: { id } });
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = base;
    let counter = 1;

    while (await this.prisma.project.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }

    return slug;
  }
}
