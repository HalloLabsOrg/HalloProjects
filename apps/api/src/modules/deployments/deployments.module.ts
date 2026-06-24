import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DeploymentsService } from './deployments.service';
import { DeploymentsController } from './deployments.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { QUEUE_NAMES } from '@hallo/shared';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.DEPLOYMENTS }),
    AuditLogsModule,
  ],
  controllers: [DeploymentsController],
  providers: [DeploymentsService],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
