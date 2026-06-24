import { Controller, Post, Headers, Req, BadRequestException } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Public } from '../../common/decorators/public.decorator';
import { Request } from 'express';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('github')
  async handleGithub(
    @Headers('x-github-signature-256') signature?: string,
    @Headers('x-github-event') event?: string,
    @Req() req?: Request & { rawBody?: Buffer },
  ) {
    if (!signature) {
      throw new BadRequestException('Missing signature');
    }
    if (!event) {
      throw new BadRequestException('Missing event type');
    }
    if (!req || !req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    return this.webhooksService.processGithubWebhook(event, signature, req.rawBody, req.body);
  }
}
