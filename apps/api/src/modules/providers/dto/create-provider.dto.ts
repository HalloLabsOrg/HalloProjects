import { IsString, IsEnum, IsUrl, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProviderType } from '@prisma/client';

export class CreateGithubProviderDto {
  @ApiProperty({ example: 'My GitHub' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'github_pat_xxxx' })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiPropertyOptional({ example: 'my-org' })
  @IsString()
  @IsOptional()
  owner?: string;

  @ApiPropertyOptional({ example: 'webhook_secret_xxx' })
  @IsString()
  @IsOptional()
  webhookSecret?: string;
}

export class CreateCoolifyProviderDto {
  @ApiProperty({ example: 'My Coolify' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'https://coolify.myserver.com' })
  @IsUrl({ require_tld: false })
  apiUrl!: string;

  @ApiProperty({ example: 'coolify_api_token_xxxx' })
  @IsString()
  @MinLength(1)
  apiToken!: string;
}

export class CreateProviderDto {
  @ApiProperty({ enum: ProviderType })
  @IsEnum(ProviderType)
  type!: ProviderType;

  @ApiProperty({ example: 'My Provider' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ description: 'Provider configuration (token, apiUrl, etc.)' })
  config!: Record<string, string>;
}
