import { Test, TestingModule } from '@nestjs/testing';
import { DeploymentsService } from './deployments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bull';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeploymentStatus } from '@prisma/client';
import { QUEUE_NAMES, JOB_NAMES } from '@hallo/shared';
import { ProviderFactory } from '../providers/provider.factory';

const mockPrisma = {
  deployment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  service: { findUnique: jest.fn() },
  environment: { findUnique: jest.fn() },
  providerConnection: { findUnique: jest.fn() },
};

const mockQueue = { add: jest.fn() };

const mockProviderFactory = {
  getRepositoryProvider: jest.fn(),
  getDeploymentProvider: jest.fn(),
};

const mockService = {
  id: 'svc-1',
  name: 'api',
  branch: 'main',
  repository: { id: 'repo-1', name: 'my-repo' },
};
const mockEnvironment = { id: 'env-1', name: 'production' };
const mockProvider = { id: 'prov-1', name: 'Coolify', type: 'COOLIFY' };

describe('DeploymentsService', () => {
  let service: DeploymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken(QUEUE_NAMES.DEPLOYMENTS), useValue: mockQueue },
        { provide: ProviderFactory, useValue: mockProviderFactory },
      ],
    }).compile();

    service = module.get<DeploymentsService>(DeploymentsService);
  });

  describe('triggerDeploy()', () => {
    const dto = { environmentId: 'env-1', providerId: 'prov-1', branch: 'main' };
    const triggeredBy = 'user-1';

    beforeEach(() => {
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockPrisma.environment.findUnique.mockResolvedValue(mockEnvironment);
      mockPrisma.providerConnection.findUnique.mockResolvedValue(mockProvider);
    });

    it('creates deployment with PENDING status', async () => {
      const created = { id: 'dep-1', status: DeploymentStatus.PENDING, ...dto };
      mockPrisma.deployment.create.mockResolvedValue(created);
      mockQueue.add.mockResolvedValue({});

      const result = await service.triggerDeploy('svc-1', dto, triggeredBy);

      expect(mockPrisma.deployment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: DeploymentStatus.PENDING }),
        }),
      );
      expect(result.status).toBe(DeploymentStatus.PENDING);
    });

    it('pushes job to BullMQ queue', async () => {
      const created = { id: 'dep-1', status: DeploymentStatus.PENDING };
      mockPrisma.deployment.create.mockResolvedValue(created);
      mockQueue.add.mockResolvedValue({});

      await service.triggerDeploy('svc-1', dto, triggeredBy);

      expect(mockQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.DEPLOY_SERVICE,
        { deploymentId: 'dep-1' },
        expect.objectContaining({ attempts: 3 }),
      );
    });

    it('throws NotFoundException when service not found', async () => {
      mockPrisma.service.findUnique.mockResolvedValue(null);
      await expect(service.triggerDeploy('bad-id', dto, triggeredBy)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when environment not found', async () => {
      mockPrisma.environment.findUnique.mockResolvedValue(null);
      await expect(service.triggerDeploy('svc-1', dto, triggeredBy)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when provider not found', async () => {
      mockPrisma.providerConnection.findUnique.mockResolvedValue(null);
      await expect(service.triggerDeploy('svc-1', dto, triggeredBy)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel()', () => {
    it('cancels a PENDING deployment', async () => {
      const deployment = { id: 'dep-1', status: DeploymentStatus.PENDING };
      mockPrisma.deployment.findUnique.mockResolvedValue(deployment);
      mockPrisma.deployment.update.mockResolvedValue({
        ...deployment,
        status: DeploymentStatus.CANCELLED,
      });

      const result = await service.cancel('dep-1');

      expect(mockPrisma.deployment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: DeploymentStatus.CANCELLED }),
        }),
      );
      expect(result.status).toBe(DeploymentStatus.CANCELLED);
    });

    it('cancels a BUILDING deployment', async () => {
      const deployment = { id: 'dep-1', status: DeploymentStatus.BUILDING };
      mockPrisma.deployment.findUnique.mockResolvedValue(deployment);
      mockPrisma.deployment.update.mockResolvedValue({
        ...deployment,
        status: DeploymentStatus.CANCELLED,
      });

      const result = await service.cancel('dep-1');
      expect(result.status).toBe(DeploymentStatus.CANCELLED);
    });

    it('throws BadRequestException when deployment is SUCCESS', async () => {
      const deployment = { id: 'dep-1', status: DeploymentStatus.SUCCESS };
      mockPrisma.deployment.findUnique.mockResolvedValue(deployment);

      await expect(service.cancel('dep-1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when deployment is FAILED', async () => {
      const deployment = { id: 'dep-1', status: DeploymentStatus.FAILED };
      mockPrisma.deployment.findUnique.mockResolvedValue(deployment);

      await expect(service.cancel('dep-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when deployment not found', async () => {
      mockPrisma.deployment.findUnique.mockResolvedValue(null);
      await expect(service.cancel('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
