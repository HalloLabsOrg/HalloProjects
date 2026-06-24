import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({ example: 'api-server' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'repo-id-here' })
  @IsString()
  repositoryId!: string;

  @ApiPropertyOptional({ example: 'main' })
  @IsString()
  @IsOptional()
  branch?: string;
}

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'api-server-v2' })
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  repositoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branch?: string;
}
