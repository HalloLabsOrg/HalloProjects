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
import * as crypto from 'crypto';

const SECRET_FIELDS = ['token', 'apiToken', 'webhookSecret', 'privateKey', 'clientSecret'];

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
    await this.syncGithubAppInstallations();
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
      await this.prisma.providerConnection
        .update({
          where: { id },
          data: { lastTestedAt: new Date(), isActive: false },
        })
        .catch(() => {});
      return { success: false, message };
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.providerConnection.delete({ where: { id } });
  }

  async syncRepositories(connectionId: string) {
    return this.repositoriesService.sync(connectionId);
  }

  generateGithubAppJwt(appId: string, privateKeyPem: string): string {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // 1 minute in past to allow clock drift
      exp: now + 10 * 60, // 10 minutes max
      iss: appId,
    };

    const base64UrlEncode = (str: string) => {
      return Buffer.from(str)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const headerEncoded = base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = base64UrlEncode(JSON.stringify(payload));

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${headerEncoded}.${payloadEncoded}`);

    const signatureEncoded = sign
      .sign(privateKeyPem, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;
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

  async syncGithubAppInstallations() {
    const rootConnection = await this.prisma.providerConnection.findFirst({
      where: {
        type: ProviderType.GITHUB,
        config: {
          path: ['authMethod'],
          equals: 'github_app',
        },
      },
    });

    if (!rootConnection) return;

    try {
      const config = this.decryptConfig(rootConnection.config as any);
      const jwtToken = this.generateGithubAppJwt(config.appId, config.privateKey);

      const response = await fetch('https://api.github.com/app/installations', {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'HALLO-Projects-Server',
        },
      });

      if (!response.ok) {
        return;
      }

      const installations = (await response.json()) as any[];

      for (const inst of installations) {
        const installationId = String(inst.id);
        const owner = inst.account.login;

        const existingInst = await this.prisma.providerConnection.findFirst({
          where: {
            type: ProviderType.GITHUB,
            config: {
              path: ['installationId'],
              equals: installationId,
            },
          },
        });

        const instConfig = {
          authMethod: 'github_app_installation',
          installationId,
          appConnectionId: rootConnection.id,
          owner,
          avatarUrl: inst.account.avatar_url,
        };

        if (existingInst) {
          const existingConfig = existingInst.config as any;
          if (
            existingConfig.owner !== owner ||
            existingConfig.appConnectionId !== rootConnection.id ||
            existingConfig.avatarUrl !== inst.account.avatar_url
          ) {
            await this.prisma.providerConnection.update({
              where: { id: existingInst.id },
              data: {
                name: `GitHub (${owner})`,
                config: instConfig,
              },
            });
          }
        } else {
          await this.prisma.providerConnection.create({
            data: {
              type: ProviderType.GITHUB,
              name: `GitHub (${owner})`,
              config: instConfig,
              isActive: true,
            },
          });
        }
      }
    } catch (err) {
      console.error('Failed to auto-sync GitHub App installations:', err);
    }
  }
}
