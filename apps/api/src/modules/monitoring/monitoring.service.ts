import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MonitoringStatus } from '@prisma/client';

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const projects = await this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        services: {
          orderBy: { name: 'asc' },
        },
      },
    });

    const summaries = [];

    for (const project of projects) {
      const servicesWithStatus = [];

      for (const service of project.services) {
        const latestResult = await this.prisma.monitoringResult.findFirst({
          where: { serviceId: service.id },
          orderBy: { checkedAt: 'desc' },
        });

        servicesWithStatus.push({
          id: service.id,
          name: service.name,
          slug: service.slug,
          status: latestResult ? latestResult.status : MonitoringStatus.UNKNOWN,
          lastCheckedAt: latestResult ? latestResult.checkedAt : null,
          responseTime: latestResult ? latestResult.responseTime : null,
        });
      }

      summaries.push({
        id: project.id,
        name: project.name,
        services: servicesWithStatus,
      });
    }

    return summaries;
  }

  async getServiceDetail(serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) throw new NotFoundException(`Service ${serviceId} not found`);

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [latestResult, results24h] = await Promise.all([
      this.prisma.monitoringResult.findFirst({
        where: { serviceId },
        orderBy: { checkedAt: 'desc' },
      }),
      this.prisma.monitoringResult.findMany({
        where: {
          serviceId,
          checkedAt: { gte: yesterday },
        },
        orderBy: { checkedAt: 'asc' },
      }),
    ]);

    const totalChecks = results24h.length;
    let uptime24h = 100.0;
    let avgResponseTime = 0;

    if (totalChecks > 0) {
      const healthyChecks = results24h.filter(
        (r) => r.status === MonitoringStatus.ONLINE || r.status === MonitoringStatus.SLOW,
      ).length;
      uptime24h = parseFloat(((healthyChecks / totalChecks) * 100).toFixed(2));

      const responseTimes = results24h
        .map((r) => r.responseTime)
        .filter((t): t is number => t !== null);
      if (responseTimes.length > 0) {
        const sum = responseTimes.reduce((acc, t) => acc + t, 0);
        avgResponseTime = Math.round(sum / responseTimes.length);
      }
    }

    return {
      id: service.id,
      name: service.name,
      slug: service.slug,
      status: latestResult ? latestResult.status : MonitoringStatus.UNKNOWN,
      uptime24h,
      averageResponseTime24h: avgResponseTime,
      lastCheckedAt: latestResult ? latestResult.checkedAt : null,
      latestResults24h: results24h.map((r) => ({
        id: r.id,
        status: r.status,
        responseTime: r.responseTime,
        checkedAt: r.checkedAt,
      })),
    };
  }

  async getServiceHistory(serviceId: string, page = 1, limit = 20) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) throw new NotFoundException(`Service ${serviceId} not found`);

    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      this.prisma.monitoringResult.findMany({
        where: { serviceId },
        orderBy: { checkedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.monitoringResult.count({
        where: { serviceId },
      }),
    ]);

    return {
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
