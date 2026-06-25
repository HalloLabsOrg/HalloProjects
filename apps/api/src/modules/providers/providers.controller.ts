import { Controller, Get, Post, Delete, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProvidersService } from './providers.service';
import { CreateGithubProviderDto, CreateCoolifyProviderDto } from './dto/create-provider.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Role, AuditAction, ProviderType } from '@prisma/client';
import { User } from '@prisma/client';
import { Request } from 'express';

@ApiTags('Providers')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all provider connections' })
  findAll() {
    return this.providersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a provider connection' })
  findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Post('github')
  @ApiOperation({ summary: 'Connect GitHub with Personal Access Token' })
  async createGithub(
    @Body() dto: CreateGithubProviderDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const connection = await this.providersService.createGithub(dto);
    await this.auditLogsService.log({
      action: AuditAction.PROVIDER_CONNECTED,
      userId: user.id,
      entityType: 'ProviderConnection',
      entityId: connection.id,
      metadata: { name: dto.name, type: ProviderType.GITHUB },
      req,
    });
    return connection;
  }

  @Post('coolify')
  @ApiOperation({ summary: 'Connect Coolify instance' })
  async createCoolify(
    @Body() dto: CreateCoolifyProviderDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const connection = await this.providersService.createCoolify(dto);
    await this.auditLogsService.log({
      action: AuditAction.PROVIDER_CONNECTED,
      userId: user.id,
      entityType: 'ProviderConnection',
      entityId: connection.id,
      metadata: { name: dto.name, type: ProviderType.COOLIFY, apiUrl: dto.apiUrl },
      req,
    });
    return connection;
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test provider connection' })
  test(@Param('id') id: string) {
    return this.providersService.testConnection(id);
  }

  @Get(':id/coolify/applications')
  @ApiOperation({ summary: 'List all applications on a Coolify provider' })
  listCoolifyApplications(@Param('id') id: string) {
    return this.providersService.listCoolifyApplications(id);
  }

  @Get(':id/coolify/servers')
  @ApiOperation({ summary: 'List all servers on a Coolify provider' })
  listCoolifyServers(@Param('id') id: string) {
    return this.providersService.listCoolifyServers(id);
  }

  @Get(':id/coolify/projects')
  @ApiOperation({ summary: 'List all projects on a Coolify provider' })
  listCoolifyProjects(@Param('id') id: string) {
    return this.providersService.listCoolifyProjects(id);
  }

  @Get(':id/coolify/sources')
  @ApiOperation({ summary: 'List all Git sources on a Coolify provider' })
  listCoolifySources(@Param('id') id: string) {
    return this.providersService.listCoolifySources(id);
  }

  @Post(':id/coolify/applications')
  @ApiOperation({ summary: 'Create a new application on a Coolify provider' })
  createCoolifyApplication(@Param('id') id: string, @Body() payload: any) {
    return this.providersService.createCoolifyApplication(id, payload);
  }

  @Post(':id/coolify/projects')
  @ApiOperation({ summary: 'Create a new project on a Coolify provider' })
  createCoolifyProject(@Param('id') id: string, @Body() payload: any) {
    return this.providersService.createCoolifyProject(id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a provider connection' })
  async remove(@Param('id') id: string, @CurrentUser() user: User, @Req() req: Request) {
    await this.providersService.remove(id);
    await this.auditLogsService.log({
      action: AuditAction.PROVIDER_DISCONNECTED,
      userId: user.id,
      entityType: 'ProviderConnection',
      entityId: id,
      req,
    });
  }
}
