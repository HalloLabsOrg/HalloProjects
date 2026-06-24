import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { EncryptionModule } from './encryption/encryption.module';
import { DeploymentProcessor } from './processors/deployment.processor';
import { RepositorySyncProcessor } from './processors/repository-sync.processor';
import { QUEUE_NAMES } from '@hallo/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.DEPLOYMENTS },
      { name: QUEUE_NAMES.REPOSITORY_SYNC },
    ),
    PrismaModule,
    EncryptionModule,
  ],
  providers: [DeploymentProcessor, RepositorySyncProcessor],
})
export class AppModule {}
