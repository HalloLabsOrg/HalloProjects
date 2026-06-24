import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EnvironmentsService } from './environments.service';
import {
  CreateEnvironmentDto,
  UpdateEnvironmentDto,
  CreateEnvVariableDto,
  UpdateEnvVariableDto,
} from './dto/environment.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { User, AuditAction } from '@prisma/client';
import { Request } from 'express';

@ApiTags('Environments')
@ApiBearerAuth()
@Controller('projects/:projectId/environments')
export class EnvironmentsController {
  constructor(
    private readonly environmentsService: EnvironmentsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List environments in a project' })
  findAll(@Param('projectId') projectId: string) {
    return this.environmentsService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an environment' })
  findOne(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.environmentsService.findOne(projectId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an environment' })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateEnvironmentDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const env = await this.environmentsService.create(projectId, dto);
    await this.auditLogsService.log({
      action: AuditAction.ENVIRONMENT_CREATED,
      userId: user.id,
      entityType: 'Environment',
      entityId: env.id,
      req,
    });
    return env;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an environment' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEnvironmentDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const env = await this.environmentsService.update(projectId, id, dto);
    await this.auditLogsService.log({
      action: AuditAction.ENVIRONMENT_UPDATED,
      userId: user.id,
      entityType: 'Environment',
      entityId: id,
      req,
    });
    return env;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an environment' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    await this.environmentsService.remove(projectId, id);
    await this.auditLogsService.log({
      action: AuditAction.ENVIRONMENT_DELETED,
      userId: user.id,
      entityType: 'Environment',
      entityId: id,
      req,
    });
  }

  // Variables sub-resource

  @Get(':id/variables')
  @ApiOperation({ summary: 'List environment variables' })
  findVariables(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.environmentsService.findVariables(projectId, id);
  }

  @Post(':id/variables')
  @ApiOperation({ summary: 'Create an environment variable' })
  async createVariable(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: CreateEnvVariableDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const variable = await this.environmentsService.createVariable(projectId, id, dto);
    await this.auditLogsService.log({
      action: AuditAction.VARIABLE_CREATED,
      userId: user.id,
      entityType: 'EnvironmentVariable',
      entityId: variable.id,
      req,
    });
    return variable;
  }

  @Patch(':id/variables/:varId')
  @ApiOperation({ summary: 'Update an environment variable' })
  async updateVariable(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('varId') varId: string,
    @Body() dto: UpdateEnvVariableDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const variable = await this.environmentsService.updateVariable(projectId, id, varId, dto);
    await this.auditLogsService.log({
      action: AuditAction.VARIABLE_UPDATED,
      userId: user.id,
      entityType: 'EnvironmentVariable',
      entityId: varId,
      req,
    });
    return variable;
  }

  @Delete(':id/variables/:varId')
  @ApiOperation({ summary: 'Delete an environment variable' })
  async removeVariable(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('varId') varId: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    await this.environmentsService.removeVariable(projectId, id, varId);
    await this.auditLogsService.log({
      action: AuditAction.VARIABLE_DELETED,
      userId: user.id,
      entityType: 'EnvironmentVariable',
      entityId: varId,
      req,
    });
  }
}
