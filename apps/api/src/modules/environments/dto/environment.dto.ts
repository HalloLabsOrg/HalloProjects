import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnvironmentDto {
  @ApiProperty({ example: 'staging' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional({ example: 'staging' })
  @IsString()
  @IsOptional()
  branch?: string;

  @ApiPropertyOptional({ example: 'staging.myapp.com' })
  @IsString()
  @IsOptional()
  domain?: string;
}

export class UpdateEnvironmentDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branch?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  domain?: string;
}

export class CreateEnvVariableDto {
  @ApiProperty({ example: 'DATABASE_URL' })
  @IsString()
  @MinLength(1)
  key!: string;

  @ApiProperty({ example: 'postgresql://...' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  isSecret?: boolean;
}

export class UpdateEnvVariableDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  value?: string;

  @ApiPropertyOptional()
  @IsOptional()
  isSecret?: boolean;
}
