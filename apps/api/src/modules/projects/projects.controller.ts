import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ParsePaginationPipe } from '../../common/pipes/parse-pagination.pipe';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { User, AuditAction } from '@prisma/client';
import { Request } from 'express';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all projects' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query(ParsePaginationPipe) pagination: any) {
    return this.projectsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a project' })
  async create(@Body() dto: CreateProjectDto, @CurrentUser() user: User, @Req() req: Request) {
    const project = await this.projectsService.create(dto, user.id);
    await this.auditLogsService.log({
      action: AuditAction.PROJECT_CREATED,
      userId: user.id,
      entityType: 'Project',
      entityId: project.id,
      req,
    });
    return project;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  async update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: User, @Req() req: Request) {
    const project = await this.projectsService.update(id, dto);
    await this.auditLogsService.log({
      action: AuditAction.PROJECT_UPDATED,
      userId: user.id,
      entityType: 'Project',
      entityId: id,
      req,
    });
    return project;
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive a project' })
  async archive(@Param('id') id: string, @CurrentUser() user: User, @Req() req: Request) {
    const project = await this.projectsService.archive(id);
    await this.auditLogsService.log({
      action: AuditAction.PROJECT_ARCHIVED,
      userId: user.id,
      entityType: 'Project',
      entityId: id,
      req,
    });
    return project;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  async remove(@Param('id') id: string, @CurrentUser() user: User, @Req() req: Request) {
    await this.projectsService.remove(id);
    await this.auditLogsService.log({
      action: AuditAction.PROJECT_ARCHIVED,
      userId: user.id,
      entityType: 'Project',
      entityId: id,
      req,
    });
  }
}
