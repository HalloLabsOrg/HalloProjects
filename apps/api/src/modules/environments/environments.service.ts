import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import {
  CreateEnvironmentDto,
  UpdateEnvironmentDto,
  CreateEnvVariableDto,
  UpdateEnvVariableDto,
} from './dto/environment.dto';

@Injectable()
export class EnvironmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async findAll(projectId: string) {
    await this.ensureProjectExists(projectId);
    return this.prisma.environment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { variables: true } } },
    });
  }

  async findOne(projectId: string, id: string) {
    const env = await this.prisma.environment.findFirst({
      where: { id, projectId },
    });
    if (!env) throw new NotFoundException(`Environment ${id} not found`);
    return env;
  }

  async create(projectId: string, dto: CreateEnvironmentDto) {
    await this.ensureProjectExists(projectId);
    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return this.prisma.environment.create({
      data: {
        projectId,
        name: dto.name,
        slug,
        branch: dto.branch,
        domain: dto.domain,
        autoDeploy: dto.autoDeploy ?? true,
      },
    });
  }

  async update(projectId: string, id: string, dto: UpdateEnvironmentDto) {
    await this.findOne(projectId, id);
    return this.prisma.environment.update({ where: { id }, data: dto });
  }

  async remove(projectId: string, id: string) {
    await this.findOne(projectId, id);
    await this.prisma.environment.delete({ where: { id } });
  }

  // --- Variables ---

  async findVariables(projectId: string, envId: string) {
    await this.findOne(projectId, envId);
    const vars = await this.prisma.environmentVariable.findMany({
      where: { environmentId: envId },
      orderBy: { key: 'asc' },
    });
    return vars.map((v) => this.maskVariable(v));
  }

  async createVariable(projectId: string, envId: string, dto: CreateEnvVariableDto) {
    await this.findOne(projectId, envId);

    const existing = await this.prisma.environmentVariable.findUnique({
      where: { environmentId_key: { environmentId: envId, key: dto.key } },
    });
    if (existing) throw new ConflictException(`Variable ${dto.key} already exists`);

    const encryptedValue = dto.isSecret ? this.encryption.encrypt(dto.value) : dto.value;

    const variable = await this.prisma.environmentVariable.create({
      data: {
        environmentId: envId,
        key: dto.key,
        value: encryptedValue,
        isSecret: dto.isSecret ?? false,
      },
    });

    return this.maskVariable(variable);
  }

  async updateVariable(projectId: string, envId: string, varId: string, dto: UpdateEnvVariableDto) {
    await this.findOne(projectId, envId);

    const variable = await this.prisma.environmentVariable.findFirst({
      where: { id: varId, environmentId: envId },
    });
    if (!variable) throw new NotFoundException(`Variable ${varId} not found`);

    const updatedValue =
      dto.value !== undefined
        ? (dto.isSecret ?? variable.isSecret)
          ? this.encryption.encrypt(dto.value)
          : dto.value
        : undefined;

    const updated = await this.prisma.environmentVariable.update({
      where: { id: varId },
      data: {
        ...(updatedValue !== undefined ? { value: updatedValue } : {}),
        ...(dto.isSecret !== undefined ? { isSecret: dto.isSecret } : {}),
      },
    });

    return this.maskVariable(updated);
  }

  async removeVariable(projectId: string, envId: string, varId: string) {
    await this.findOne(projectId, envId);
    const variable = await this.prisma.environmentVariable.findFirst({
      where: { id: varId, environmentId: envId },
    });
    if (!variable) throw new NotFoundException(`Variable ${varId} not found`);
    await this.prisma.environmentVariable.delete({ where: { id: varId } });
  }

  private maskVariable<T extends { isSecret: boolean; value: string; id: string }>(v: T): T {
    return { ...v, value: v.isSecret ? '***' : v.value };
  }

  private async ensureProjectExists(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);
  }
}
