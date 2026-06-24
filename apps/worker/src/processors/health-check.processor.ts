import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUE_NAMES, JOB_NAMES } from '@hallo/shared';
import { MonitoringStatus } from '@prisma/client';

@Processor(QUEUE_NAMES.HEALTH_CHECKS)
export class HealthCheckProcessor {
  private readonly logger = new Logger(HealthCheckProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process(JOB_NAMES.CHECK_SERVICE_HEALTH)
  async handleCheck(_job: Job) {
    this.logger.log('Executing repeatable service health check job');

    try {
      const projects = await this.prisma.project.findMany({
        include: {
          services: true,
          environments: {
            where: {
              OR: [{ domain: { not: null } }, { healthCheckUrl: { not: null } }],
            },
          },
        },
      });

      const checkPromises: Promise<void>[] = [];

      for (const project of projects) {
        for (const service of project.services) {
          for (const environment of project.environments) {
            let targetUrl = environment.healthCheckUrl || environment.domain;
            if (!targetUrl || targetUrl.trim() === '') continue;

            targetUrl = this.normalizeUrl(targetUrl);
            const timeoutMs = (service.healthCheckTimeout || 10) * 1000;

            checkPromises.push(this.performCheck(service.id, environment.id, targetUrl, timeoutMs));
          }
        }
      }

      await Promise.all(checkPromises);
      this.logger.log(`Completed ${checkPromises.length} service health checks.`);
    } catch (error) {
      this.logger.error('Failed executing service health checks:', error);
    }
  }

  private normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }

  private async performCheck(
    serviceId: string,
    environmentId: string,
    url: string,
    timeoutMs: number,
  ): Promise<void> {
    const startTime = Date.now();
    try {
      this.logger.debug(
        `Checking service ${serviceId} in environment ${environmentId} at URL: ${url}`,
      );

      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });

      const responseTime = Date.now() - startTime;

      let status: MonitoringStatus = MonitoringStatus.ONLINE;
      if (response.status >= 400) {
        status = MonitoringStatus.OFFLINE;
      } else if (responseTime >= 1000) {
        status = MonitoringStatus.SLOW;
      }

      await this.prisma.monitoringResult.create({
        data: {
          serviceId,
          environmentId,
          url,
          status,
          statusCode: response.status,
          responseTime,
        },
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : '';
      this.logger.warn(`Health check failed for service ${serviceId} at ${url}: ${errorMessage}`);

      const isTimeout =
        errorName === 'TimeoutError' ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('aborted');

      await this.prisma.monitoringResult.create({
        data: {
          serviceId,
          environmentId,
          url,
          status: MonitoringStatus.OFFLINE,
          statusCode: isTimeout ? 408 : 500,
          responseTime: isTimeout ? timeoutMs : responseTime,
        },
      });
    }
  }
}
