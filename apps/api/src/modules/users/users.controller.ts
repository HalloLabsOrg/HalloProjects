import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role, AuditAction } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParsePaginationPipe } from '../../common/pipes/parse-pagination.pipe';
import { User } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Request } from 'express';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@Roles(Role.ADMIN)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all users (ADMIN)' })
  findAll(@Query(ParsePaginationPipe) pagination: ReturnType<ParsePaginationPipe['transform']>) {
    return this.usersService.findAll(pagination);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user (ADMIN)' })
  async create(@Body() dto: CreateUserDto, @Req() req: Request) {
    const user = await this.usersService.create(dto);
    await this.auditLogsService.log({
      action: AuditAction.USER_CREATED,
      userId: user.id,
      entityType: 'User',
      entityId: user.id,
      req,
    });
    return user;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (ADMIN)' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (ADMIN)' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: Request) {
    const user = await this.usersService.update(id, dto);
    await this.auditLogsService.log({
      action: AuditAction.USER_UPDATED,
      userId: user.id,
      entityType: 'User',
      entityId: id,
      req,
    });
    return user;
  }

  @Patch(':id/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable a user (ADMIN)' })
  async disable(@Param('id') id: string, @CurrentUser() currentUser: User, @Req() req: Request) {
    const user = await this.usersService.disable(id, currentUser.id);
    await this.auditLogsService.log({
      action: AuditAction.USER_DISABLED,
      userId: currentUser.id,
      entityType: 'User',
      entityId: id,
      req,
    });
    return user;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user (ADMIN)' })
  async remove(@Param('id') id: string, @CurrentUser() currentUser: User, @Req() req: Request) {
    const result = await this.usersService.remove(id, currentUser.id);
    await this.auditLogsService.log({
      action: AuditAction.USER_DISABLED,
      userId: currentUser.id,
      entityType: 'User',
      entityId: id,
      req,
    });
    return result;
  }
}
