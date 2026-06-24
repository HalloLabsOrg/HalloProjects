import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { GithubProvider } from '@hallo/github-provider';
import { CoolifyProvider } from '@hallo/coolify-provider';
import type { RepositoryProvider } from '@hallo/sdk';
import type { DeploymentProvider } from '@hallo/sdk';
import { ProviderType } from '@prisma/client';
import * as crypto from 'crypto';

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

    let token = config.token;
    let webhookSecret = config.webhookSecret;
    const owner = config.owner;

    if (config.authMethod === 'github_app_installation') {
      // 1. Get root GitHub App connection
      const rootApp = await this.prisma.providerConnection.findUnique({
        where: { id: config.appConnectionId },
      });
      if (!rootApp) {
        throw new Error(`Parent GitHub App connection ${config.appConnectionId} not found`);
      }

      const rootConfig = this.decryptConfig(rootApp.config as Record<string, string>);
      webhookSecret = rootConfig.webhookSecret;

      // 2. Generate JWT
      const jwtToken = this.generateGithubAppJwt(rootConfig.appId, rootConfig.privateKey);

      // 3. Request Installation Access Token (IAT)
      const response = await fetch(
        `https://api.github.com/app/installations/${config.installationId}/access_tokens`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'HALLO-Projects-Server',
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate installation token: ${errorText}`);
      }

      const tokenData = (await response.json()) as { token: string };
      token = tokenData.token;
    }

    return new GithubProvider({
      token,
      owner,
      webhookSecret,
    });
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

  private generateGithubAppJwt(appId: string, privateKeyPem: string): string {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60,
      exp: now + 10 * 60,
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
