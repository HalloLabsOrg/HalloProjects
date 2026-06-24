import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { GithubProvider } from '@hallo/github-provider';
import { CoolifyProvider } from '@hallo/coolify-provider';
import type { RepositoryProvider } from '@hallo/sdk';
import type { DeploymentProvider } from '@hallo/sdk';
import { ProviderType } from '@prisma/client';

@Injectable()
export class ProviderFactory {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async getRepositoryProvider(providerId: string): Promise<RepositoryProvider> {
    const connection = await this.prisma.providerConnection.findUnique({
      where: { id: providerId },
    });

    if (!connection) throw new NotFoundException(`Provider ${providerId} not found`);
    if (connection.type !== ProviderType.GITHUB) {
      throw new Error(`Provider ${providerId} is not a repository provider`);
    }

    const config = this.decryptConfig(connection.config as Record<string, string>);
    return new GithubProvider({ token: config.token, owner: config.owner, webhookSecret: config.webhookSecret });
  }

  async getDeploymentProvider(providerId: string): Promise<DeploymentProvider> {
    const connection = await this.prisma.providerConnection.findUnique({
      where: { id: providerId },
    });

    if (!connection) throw new NotFoundException(`Provider ${providerId} not found`);
    if (connection.type !== ProviderType.COOLIFY) {
      throw new Error(`Provider ${providerId} is not a deployment provider`);
    }

    const config = this.decryptConfig(connection.config as Record<string, string>);
    return new CoolifyProvider({ apiUrl: config.apiUrl, apiToken: config.apiToken });
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
}
