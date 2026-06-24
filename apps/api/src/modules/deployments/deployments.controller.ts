import { Controller, Get, Post, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DeploymentsService } from './deployments.service';
import { TriggerDeployDto } from './dto/deployment.dto';
import { ParsePaginationPipe } from '../../common/pipes/parse-pagination.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { User, DeploymentStatus, AuditAction } from '@prisma/client';
import { Request } from 'express';

@ApiTags('Deployments')
@ApiBearerAuth()
@Controller()
export class DeploymentsController {
  constructor(
    private readonly deploymentsService: DeploymentsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get('deployments')
  @ApiOperation({ summary: 'List all deployments' })
  @ApiQuery({ name: 'status', required: false, enum: DeploymentStatus })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query(ParsePaginationPipe) pagination: any,
    @Query('status') status?: DeploymentStatus,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.deploymentsService.findAll(pagination, { status, serviceId });
  }

  @Get('services/:serviceId/deployments')
  @ApiOperation({ summary: 'List deployments for a service' })
  findByService(
    @Param('serviceId') serviceId: string,
    @Query(ParsePaginationPipe) pagination: any,
  ) {
    return this.deploymentsService.findByService(serviceId, pagination);
  }

  @Get('deployments/:id')
  @ApiOperation({ summary: 'Get a deployment' })
  findOne(@Param('id') id: string) {
    return this.deploymentsService.findOne(id);
  }

  @Post('services/:serviceId/deploy')
  @ApiOperation({ summary: 'Trigger a deployment for a service' })
  async triggerDeploy(
    @Param('serviceId') serviceId: string,
    @Body() dto: TriggerDeployDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const deployment = await this.deploymentsService.triggerDeploy(serviceId, dto, user.id);
    await this.auditLogsService.log({
      action: AuditAction.DEPLOYMENT_TRIGGERED,
      userId: user.id,
      entityType: 'Deployment',
      entityId: deployment.id,
      req,
    });
    return deployment;
  }

  @Post('deployments/:id/cancel')
  @ApiOperation({ summary: 'Cancel a deployment' })
  async cancel(@Param('id') id: string, @CurrentUser() user: User, @Req() req: Request) {
    const deployment = await this.deploymentsService.cancel(id);
    await this.auditLogsService.log({
      action: AuditAction.DEPLOYMENT_CANCELLED,
      userId: user.id,
      entityType: 'Deployment',
      entityId: id,
      req,
    });
    return deployment;
  }
}
