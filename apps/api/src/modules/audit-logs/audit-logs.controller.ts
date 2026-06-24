import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { ParsePaginationPipe } from '../../common/pipes/parse-pagination.pipe';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, AuditAction } from '@prisma/client';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs (admin only)' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query(ParsePaginationPipe) pagination: any,
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditLogsService.findAll(pagination, { userId, action, from, to });
  }
}
