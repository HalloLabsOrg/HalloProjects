import { Module, forwardRef } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { GithubAuthController } from './github-auth.controller';
import { GithubAppController } from './github-app.controller';
import { ProviderFactory } from './provider.factory';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { RepositoriesModule } from '../repositories/repositories.module';

@Module({
  imports: [AuditLogsModule, forwardRef(() => RepositoriesModule)],
  controllers: [ProvidersController, GithubAuthController, GithubAppController],
  providers: [ProvidersService, ProviderFactory],
  exports: [ProvidersService, ProviderFactory],
})
export class ProvidersModule {}
