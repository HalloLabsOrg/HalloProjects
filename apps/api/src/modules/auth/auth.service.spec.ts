import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-1',
  email: 'admin@hallo.local',
  name: 'Admin',
  role: Role.ADMIN,
  isActive: true,
  passwordHash: '',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset mocks before each test
    jest.clearAllMocks();

    // Set a known hash for the mock user
    mockUser.passwordHash = await bcrypt.hash('admin123456', 12);
  });

  describe('login()', () => {
    it('returns access_token and user on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'admin@hallo.local',
        password: 'admin123456',
      });

      expect(result).toHaveProperty('access_token', 'mock.jwt.token');
      expect(result.user).toMatchObject({
        id: 'user-1',
        email: 'admin@hallo.local',
        role: Role.ADMIN,
      });
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@hallo.local', password: 'admin123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'admin@hallo.local', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is disabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.login({ email: 'admin@hallo.local', password: 'admin123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword()', () => {
    it('updates password hash on valid current password', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await service.changePassword(mockUser, {
        currentPassword: 'admin123456',
        newPassword: 'newpassword123',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
      expect(result).toHaveProperty('message');
    });

    it('throws BadRequestException on wrong current password', async () => {
      await expect(
        service.changePassword(mockUser, {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when new password equals current password', async () => {
      await expect(
        service.changePassword(mockUser, {
          currentPassword: 'admin123456',
          newPassword: 'admin123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
