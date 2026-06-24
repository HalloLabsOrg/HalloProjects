import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { User, AuditAction } from '@prisma/client';
import { Request } from 'express';

@ApiTags('Services')
@ApiBearerAuth()
@Controller('projects/:projectId/services')
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List services in a project' })
  findAll(@Param('projectId') projectId: string) {
    return this.servicesService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service' })
  findOne(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.servicesService.findOne(projectId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a service in a project' })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateServiceDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const service = await this.servicesService.create(projectId, dto);
    await this.auditLogsService.log({
      action: AuditAction.SERVICE_CREATED,
      userId: user.id,
      entityType: 'Service',
      entityId: service.id,
      req,
    });
    return service;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a service' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const service = await this.servicesService.update(projectId, id, dto);
    await this.auditLogsService.log({
      action: AuditAction.SERVICE_UPDATED,
      userId: user.id,
      entityType: 'Service',
      entityId: id,
      req,
    });
    return service;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a service' })
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    await this.servicesService.remove(projectId, id);
    await this.auditLogsService.log({
      action: AuditAction.SERVICE_DELETED,
      userId: user.id,
      entityType: 'Service',
      entityId: id,
      req,
    });
  }
}
