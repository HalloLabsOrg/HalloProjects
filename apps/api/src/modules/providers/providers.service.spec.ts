import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersService } from './providers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { ProviderFactory } from './provider.factory';
import { RepositoriesService } from '../repositories/repositories.service';
import * as crypto from 'crypto';

const mockPrisma = {};
const mockEncryption = {
  encrypt: jest.fn((val) => `encrypted_${val}`),
  decrypt: jest.fn((val) => val.replace('encrypted_', '')),
};
const mockFactory = {};
const mockRepositories = {
  sync: jest.fn(),
};

describe('ProvidersService', () => {
  let service: ProvidersService;

  // Generate a valid RSA key pair for testing JWT signing
  let privateKey: string;

  beforeAll(() => {
    const pair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKey = pair.privateKey;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: ProviderFactory, useValue: mockFactory },
        { provide: RepositoriesService, useValue: mockRepositories },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
  });

  describe('generateGithubAppJwt()', () => {
    it('should generate a valid HS256/RS256 JWT sign-able token with appId claim', () => {
      const appId = '123456';
      const token = service.generateGithubAppJwt(appId, privateKey);

      expect(token).toBeDefined();
      const parts = token.split('.');
      expect(parts.length).toBe(3);

      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString('utf8'));
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

      expect(header.alg).toBe('RS256');
      expect(header.typ).toBe('JWT');
      expect(payload.iss).toBe(appId);
      expect(payload.exp - payload.iat).toBe(660); // 10 minutes max + 1 minute backdated clock drift
    });
  });
});
