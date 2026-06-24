import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { ProviderFactory } from './provider.factory';
import { CreateGithubProviderDto, CreateCoolifyProviderDto } from './dto/create-provider.dto';
import { ProviderType } from '@prisma/client';
import { RepositoriesService } from '../repositories/repositories.service';

const SECRET_FIELDS = ['token', 'apiToken', 'webhookSecret'];

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly factory: ProviderFactory,
    @Inject(forwardRef(() => RepositoriesService))
    private readonly repositoriesService: RepositoriesService,
  ) {}

  async findAll() {
    const connections = await this.prisma.providerConnection.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return connections.map((c) => this.maskSecrets(c));
  }

  async findOne(id: string) {
    const connection = await this.prisma.providerConnection.findUnique({ where: { id } });
    if (!connection) throw new NotFoundException(`Provider ${id} not found`);
    return this.maskSecrets(connection);
  }

  async createGithub(dto: CreateGithubProviderDto) {
    const rawConfig: Record<string, string> = { token: dto.token, authMethod: 'pat' };
    if (dto.owner) rawConfig.owner = dto.owner;
    if (dto.webhookSecret) rawConfig.webhookSecret = dto.webhookSecret;

    const connection = await this.prisma.providerConnection.create({
      data: {
        type: ProviderType.GITHUB,
        name: dto.name,
        config: this.encryptConfig(rawConfig),
        isActive: true,
      },
    });

    // Auto-sync repositories which triggers webhook registration
    this.repositoriesService.sync(connection.id).catch((err) => {
      console.error(`Failed to auto-sync repositories for new provider ${connection.id}:`, err);
    });

    return this.maskSecrets(connection);
  }

  async createGithubOAuth(params: { name: string; token: string; owner: string }) {
    const rawConfig: Record<string, string> = {
      token: params.token,
      authMethod: 'oauth',
      owner: params.owner,
    };

    const connection = await this.prisma.providerConnection.create({
      data: {
        type: ProviderType.GITHUB,
        name: params.name,
        config: this.encryptConfig(rawConfig),
        isActive: true,
      },
    });

    // Auto-sync repositories which triggers webhook registration
    this.repositoriesService.sync(connection.id).catch((err) => {
      console.error(`Failed to auto-sync repositories for new provider ${connection.id}:`, err);
    });

    return this.maskSecrets(connection);
  }

  async createCoolify(dto: CreateCoolifyProviderDto) {
    const rawConfig: Record<string, string> = {
      apiUrl: dto.apiUrl,
      apiToken: dto.apiToken,
    };

    const connection = await this.prisma.providerConnection.create({
      data: {
        type: ProviderType.COOLIFY,
        name: dto.name,
        config: this.encryptConfig(rawConfig),
        isActive: true,
      },
    });

    return this.maskSecrets(connection);
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const connection = await this.prisma.providerConnection.findUnique({ where: { id } });
    if (!connection) throw new NotFoundException(`Provider ${id} not found`);

    try {
      if (connection.type === ProviderType.GITHUB) {
        const provider = await this.factory.getRepositoryProvider(id);
        await provider.listRepositories();
      } else if (connection.type === ProviderType.COOLIFY) {
        const provider = await this.factory.getDeploymentProvider(id);
        await provider.listApplications();
      } else {
        throw new BadRequestException(`Unknown provider type: ${connection.type}`);
      }

      await this.prisma.providerConnection.update({
        where: { id },
        data: { lastTestedAt: new Date(), isActive: true },
      });

      return { success: true, message: 'Connection successful' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      return { success: false, message };
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.providerConnection.delete({ where: { id } });
  }

  private encryptConfig(config: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      result[key] = SECRET_FIELDS.includes(key) ? this.encryption.encrypt(value) : value;
    }
    return result;
  }

  private maskSecrets<T extends { config: unknown; id: string }>(connection: T): T {
    const rawConfig = connection.config as Record<string, string>;
    const maskedConfig: Record<string, string> = {};

    for (const [key, value] of Object.entries(rawConfig)) {
      maskedConfig[key] = SECRET_FIELDS.includes(key) ? '***' : value;
    }

    return { ...connection, config: maskedConfig };
  }
}
