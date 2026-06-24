import { Controller, Get, Post, Body, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ProvidersService } from './providers.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role, AuditAction, ProviderType, User } from '@prisma/client';
import { Request } from 'express';

@ApiTags('Providers')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('providers/github-auth')
export class GithubAuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly providersService: ProvidersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get('authorize-url')
  @ApiOperation({ summary: 'Get GitHub OAuth authorization URL' })
  getAuthorizeUrl() {
    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const redirectUri = this.configService.get<string>('GITHUB_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      return { url: null, configured: false };
    }

    const scopes = ['repo', 'admin:repo_hook'].join(' ');
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(scopes)}`;

    return { url, configured: true };
  }

  @Post('callback')
  @ApiOperation({ summary: 'Exchange code for token and register connection' })
  async callback(@Body() body: { code: string }, @CurrentUser() user: User, @Req() req: Request) {
    const { code } = body;
    if (!code) {
      throw new BadRequestException('Authorization code is required');
    }

    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GITHUB_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('GitHub OAuth is not fully configured on this server');
    }

    // 1. Exchange authorization code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new BadRequestException('Failed to exchange code with GitHub');
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error || !tokenData.access_token) {
      throw new BadRequestException(
        tokenData.error_description || 'Invalid credentials or expired authorization code',
      );
    }

    const accessToken = tokenData.access_token;

    // 2. Get user info from GitHub to name the connection
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'User-Agent': 'HALLO-Projects-Server',
      },
    });

    let githubLogin = 'OAuth Connection';
    if (userResponse.ok) {
      const userData = (await userResponse.json()) as { login: string };
      githubLogin = userData.login;
    }

    // 3. Save connection using the service
    const connection = await this.providersService.createGithubOAuth({
      name: `GitHub (${githubLogin})`,
      token: accessToken,
      owner: githubLogin,
    });

    // 4. Log the audit event
    await this.auditLogsService.log({
      action: AuditAction.PROVIDER_CONNECTED,
      userId: user.id,
      entityType: 'ProviderConnection',
      entityId: connection.id,
      metadata: { name: connection.name, type: ProviderType.GITHUB, authMethod: 'oauth' },
      req,
    });

    return connection;
  }
}
