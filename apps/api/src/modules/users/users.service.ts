import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQuery } from '../../common/pipes/parse-pagination.pipe';
import { paginateArgs, paginateResponse } from '../../common/helpers/paginate.helper';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: false,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(pagination: PaginationQuery) {
    const where: Prisma.UserWhereInput = pagination.search
      ? {
          OR: [
            { name: { contains: pagination.search, mode: 'insensitive' } },
            { email: { contains: pagination.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        ...paginateArgs(pagination),
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginateResponse(items, total, pagination);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email is already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: dto.role,
      },
      select: USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async disable(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot disable your own account');
    }

    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: USER_SELECT,
    });
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    await this.findOne(id);

    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }
}
