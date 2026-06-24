import { Controller, Get, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';

@ApiTags('Monitoring')
@ApiBearerAuth()
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get()
  @ApiOperation({ summary: 'Get overview of all service states grouped by project' })
  getSummary() {
    return this.monitoringService.getSummary();
  }

  @Get(':serviceId')
  @ApiOperation({ summary: 'Get detailed status and 24h uptime metrics for a service' })
  getServiceDetail(@Param('serviceId') serviceId: string) {
    return this.monitoringService.getServiceDetail(serviceId);
  }

  @Get(':serviceId/history')
  @ApiOperation({ summary: 'Get paginated health check history for a service' })
  getServiceHistory(
    @Param('serviceId') serviceId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.monitoringService.getServiceHistory(serviceId, page, limit);
  }
}
