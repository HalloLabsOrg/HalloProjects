import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES, JOB_NAMES } from '@hallo/shared';

@Injectable()
export class HealthSchedulerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HealthSchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.HEALTH_CHECKS) private readonly healthQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const intervalStr = this.configService.get<string>('HEALTH_CHECK_INTERVAL');
    // Default to 60000ms (60 seconds)
    const interval = intervalStr ? parseInt(intervalStr, 10) * 1000 : 60000;

    this.logger.log(`Initializing repeatable service health checks. Interval: ${interval}ms`);

    try {
      // Clean up any existing repeatable health-check jobs to prevent duplicates
      const jobs = await this.healthQueue.getRepeatableJobs();
      for (const job of jobs) {
        if (job.name === JOB_NAMES.CHECK_SERVICE_HEALTH) {
          this.logger.log(`Removing old repeatable job: ${job.key}`);
          await this.healthQueue.removeRepeatableByKey(job.key);
        }
      }

      // Flush any queued or stuck jobs to prevent queue flooding
      try {
        await this.healthQueue.empty();
        await this.healthQueue.clean(0, 'delayed');
        await this.healthQueue.clean(0, 'wait');
        await this.healthQueue.clean(0, 'active');
        await this.healthQueue.clean(0, 'completed');
        await this.healthQueue.clean(0, 'failed');
      } catch (cleanError) {
        this.logger.warn('Non-fatal error cleaning health check queue:', cleanError);
      }

      // Add new repeatable job
      await this.healthQueue.add(
        JOB_NAMES.CHECK_SERVICE_HEALTH,
        {},
        {
          repeat: {
            every: interval,
          },
          removeOnComplete: true,
          removeOnFail: true,
        },
      );

      this.logger.log('Successfully registered repeatable service health check job.');
    } catch (error) {
      this.logger.error('Failed to initialize repeatable health check job:', error);
    }
  }
}
