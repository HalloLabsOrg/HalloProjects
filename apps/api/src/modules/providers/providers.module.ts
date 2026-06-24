import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { ProviderFactory } from './provider.factory';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, ProviderFactory],
  exports: [ProvidersService, ProviderFactory],
})
export class ProvidersModule {}
