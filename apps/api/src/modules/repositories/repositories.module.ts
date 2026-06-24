import { Module, forwardRef } from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { RepositoriesController } from './repositories.controller';
import { ProvidersModule } from '../providers/providers.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [forwardRef(() => ProvidersModule), AuditLogsModule],
  controllers: [RepositoriesController],
  providers: [RepositoriesService],
  exports: [RepositoriesService],
})
export class RepositoriesModule {}
