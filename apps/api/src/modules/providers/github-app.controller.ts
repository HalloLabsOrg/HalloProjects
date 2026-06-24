import { Controller, Get, Post, Body, Req, BadRequestException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role, AuditAction, ProviderType, User } from '@prisma/client';
import { Request } from 'express';
import * as crypto from 'crypto';

@ApiTags('Providers')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('providers/github-app')
export class GithubAppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providersService: ProvidersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Check if root GitHub App is configured' })
  async getStatus() {
    const rootConnection = await this.prisma.providerConnection.findFirst({
      where: {
        type: ProviderType.GITHUB,
        config: {
          path: ['authMethod'],
          equals: 'github_app',
        },
      },
    });

    if (!rootConnection) {
      return { configured: false, appName: null, htmlUrl: null };
    }

    const config = rootConnection.config as any;
    return {
      configured: true,
      appName: rootConnection.name,
      htmlUrl: config.htmlUrl ?? null,
    };
  }

  @Post('manifest-payload')
  @ApiOperation({ summary: 'Generate GitHub App Manifest Payload' })
  async getManifestPayload(@Body() body: { frontendUrl: string }) {
    const { frontendUrl } = body;
    if (!frontendUrl) {
      throw new BadRequestException('frontendUrl is required');
    }

    // Infer API URL from frontendUrl or default to localhost:4000
    const apiUrl = frontendUrl.includes('localhost')
      ? 'http://localhost:4000'
      : frontendUrl.replace('://', '://api.'); // Custom fallback or handle properly

    const uniqueId = Math.random().toString(36).substring(2, 8);
    const manifest = {
      name: `HALLO Projects (${uniqueId})`,
      url: frontendUrl,
      hook_attributes: {
        url: `${apiUrl}/api/webhooks/github`,
        active: !apiUrl.includes('localhost'),
      },
      redirect_url: `${frontendUrl}/providers/github-app/callback`,
      public: true,
      default_permissions: {
        contents: 'write',
        metadata: 'read',
        repository_hooks: 'write',
        pull_requests: 'write',
      },
      default_events: ['push', 'pull_request'],
    };

    return manifest;
  }

  @Post('callback')
  @ApiOperation({ summary: 'Convert manifest code to App Credentials' })
  async callback(@Body() body: { code: string }, @CurrentUser() user: User, @Req() req: Request) {
    const { code } = body;
    if (!code) {
      throw new BadRequestException('Manifest code is required');
    }

    const response = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'HALLO-Projects-Server',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(`Failed to register GitHub App: ${errorText}`);
    }

    const appData = (await response.json()) as {
      id: number;
      client_id: string;
      client_secret: string;
      webhook_secret: string;
      pem: string;
      html_url: string;
      name: string;
    };

    // Save or update root github_app connection
    // We check if one already exists to avoid duplicate apps
    const existing = await this.prisma.providerConnection.findFirst({
      where: {
        type: ProviderType.GITHUB,
        config: {
          path: ['authMethod'],
          equals: 'github_app',
        },
      },
    });

    const configData = {
      authMethod: 'github_app',
      appId: String(appData.id),
      clientId: appData.client_id,
      clientSecret: appData.client_secret,
      webhookSecret: appData.webhook_secret,
      privateKey: appData.pem,
      htmlUrl: appData.html_url,
    };

    let connection;
    if (existing) {
      connection = await this.prisma.providerConnection.update({
        where: { id: existing.id },
        data: {
          name: appData.name,
          config: configData,
        },
      });
    } else {
      connection = await this.prisma.providerConnection.create({
        data: {
          type: ProviderType.GITHUB,
          name: appData.name,
          config: configData,
          isActive: true,
        },
      });
    }

    await this.auditLogsService.log({
      action: AuditAction.PROVIDER_CONNECTED,
      userId: user.id,
      entityType: 'ProviderConnection',
      entityId: connection.id,
      metadata: { name: connection.name, type: ProviderType.GITHUB, authMethod: 'github_app' },
      req,
    });

    return { success: true, connectionId: connection.id, appName: connection.name };
  }

  @Post('installations')
  @ApiOperation({ summary: 'Register a GitHub App Installation' })
  async registerInstallation(
    @Body() body: { installationId: string },
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const { installationId } = body;
    if (!installationId) {
      throw new BadRequestException('installationId is required');
    }

    // 1. Find root GitHub App
    const rootConnection = await this.prisma.providerConnection.findFirst({
      where: {
        type: ProviderType.GITHUB,
        config: {
          path: ['authMethod'],
          equals: 'github_app',
        },
      },
    });

    if (!rootConnection) {
      throw new BadRequestException('Root GitHub App is not registered yet');
    }

    // 2. Fetch installation details from GitHub to find the owner name
    const config = rootConnection.config as any;
    const jwtToken = this.providersService.generateGithubAppJwt(config.appId, config.privateKey);

    const response = await fetch(`https://api.github.com/app/installations/${installationId}`, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'HALLO-Projects-Server',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(`Failed to verify GitHub App installation: ${errorText}`);
    }

    const installationData = (await response.json()) as {
      id: number;
      account: {
        login: string;
        avatar_url: string;
      };
    };

    const owner = installationData.account.login;

    // 3. Create or update installation ProviderConnection
    const existingInst = await this.prisma.providerConnection.findFirst({
      where: {
        type: ProviderType.GITHUB,
        config: {
          path: ['installationId'],
          equals: String(installationId),
        },
      },
    });

    const instConfig = {
      authMethod: 'github_app_installation',
      installationId: String(installationId),
      appConnectionId: rootConnection.id,
      owner,
    };

    let connection;
    if (existingInst) {
      connection = await this.prisma.providerConnection.update({
        where: { id: existingInst.id },
        data: {
          name: `GitHub (${owner})`,
          config: instConfig,
        },
      });
    } else {
      connection = await this.prisma.providerConnection.create({
        data: {
          type: ProviderType.GITHUB,
          name: `GitHub (${owner})`,
          config: instConfig,
          isActive: true,
        },
      });
    }

    // Auto-sync repositories
    this.providersService.syncRepositories(connection.id).catch((err) => {
      console.error(`Failed to auto-sync repositories for installation ${connection.id}:`, err);
    });

    await this.auditLogsService.log({
      action: AuditAction.PROVIDER_CONNECTED,
      userId: user.id,
      entityType: 'ProviderConnection',
      entityId: connection.id,
      metadata: {
        name: connection.name,
        type: ProviderType.GITHUB,
        authMethod: 'github_app_installation',
      },
      req,
    });

    return { success: true, connectionId: connection.id, owner };
  }
}
