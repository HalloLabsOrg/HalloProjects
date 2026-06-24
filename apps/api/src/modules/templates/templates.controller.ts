import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TemplatesService } from './templates.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active templates' })
  findAll(@Query() query: { all?: string }) {
    return this.templatesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template details and schema' })
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a template zip file (ADMIN)' })
  upload(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.templatesService.upload(file.buffer);
  }

  @Patch(':id/toggle')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toggle template active state (ADMIN)' })
  toggle(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    if (body.isActive === undefined) {
      throw new BadRequestException('isActive property is required');
    }
    return this.templatesService.toggle(id, body.isActive);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a template (ADMIN)' })
  delete(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }

  @Post(':id/dry-run')
  @ApiOperation({ summary: 'Dry-run template rendering' })
  dryRun(@Param('id') id: string, @Body() body: { values: Record<string, any> }) {
    if (!body.values) {
      throw new BadRequestException('values property is required');
    }
    return this.templatesService.dryRun(id, body.values);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply template to project environment' })
  apply(
    @Param('id') id: string,
    @Body() body: { projectId: string; environmentId: string; values: Record<string, any> },
  ) {
    if (!body.projectId || !body.environmentId || !body.values) {
      throw new BadRequestException('projectId, environmentId, and values properties are required');
    }
    return this.templatesService.apply(id, body.projectId, body.environmentId, body.values);
  }
}
