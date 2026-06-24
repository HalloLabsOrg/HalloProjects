import { Module } from '@nestjs/common';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsController } from './environments.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [EnvironmentsController],
  providers: [EnvironmentsService],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
