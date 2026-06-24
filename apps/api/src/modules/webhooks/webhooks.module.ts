import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ProvidersModule } from '../providers/providers.module';
import { QUEUE_NAMES } from '@hallo/shared';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.WEBHOOKS,
    }),
    ProvidersModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
