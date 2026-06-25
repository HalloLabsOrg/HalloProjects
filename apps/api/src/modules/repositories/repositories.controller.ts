import { Controller, Get, Post, Param, Query, Req, Body, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RepositoriesService } from './repositories.service';
import { ParsePaginationPipe } from '../../common/pipes/parse-pagination.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { User, AuditAction } from '@prisma/client';
import { Request } from 'express';

@ApiTags('Repositories')
@ApiBearerAuth()
@Controller('repositories')
export class RepositoriesController {
  constructor(
    private readonly repositoriesService: RepositoriesService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all synced repositories' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query(ParsePaginationPipe) pagination: any) {
    return this.repositoriesService.findAll(pagination);
  }

  @Get('remote')
  @ApiOperation({ summary: 'List remote repositories directly from GitHub' })
  @ApiQuery({ name: 'providerId', required: true })
  getRemote(@Query('providerId') providerId: string) {
    return this.repositoriesService.getRemoteRepositories(providerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a repository' })
  findOne(@Param('id') id: string) {
    return this.repositoriesService.findOne(id);
  }

  @Get(':id/branches')
  @ApiOperation({ summary: 'List branches from GitHub' })
  getBranches(@Param('id') id: string) {
    return this.repositoriesService.getBranches(id);
  }

  @Post(':id/branches')
  @ApiOperation({ summary: 'Create a new branch in the repository' })
  createBranch(@Param('id') id: string, @Body() body: { name: string; fromBranch: string }) {
    return this.repositoriesService.createBranch(id, body.name, body.fromBranch);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync repositories from all active GitHub providers' })
  @ApiQuery({ name: 'providerId', required: false })
  async sync(
    @Query('providerId') providerId: string | undefined,
    @Body() body: { externalIds?: string[] },
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const result = await this.repositoriesService.sync(providerId, body?.externalIds);
    const totalSynced = result.results.reduce((sum, r) => sum + r.synced, 0);
    await this.auditLogsService.log({
      action: AuditAction.REPOSITORY_SYNCED,
      userId: user.id,
      entityType: 'Repository',
      metadata: { providerId, syncedCount: totalSynced, externalIds: body?.externalIds },
      req,
    });
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a repository' })
  async remove(@Param('id') id: string) {
    return this.repositoriesService.delete(id);
  }
}
