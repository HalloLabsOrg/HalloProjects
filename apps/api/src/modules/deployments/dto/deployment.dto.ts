import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerDeployDto {
  @ApiProperty({ example: 'environment-id' })
  @IsString()
  environmentId!: string;

  @ApiProperty({ example: 'coolify-provider-id' })
  @IsString()
  providerId!: string;

  @ApiPropertyOptional({ example: 'main' })
  @IsString()
  @IsOptional()
  branch?: string;

  @ApiPropertyOptional({ example: 'abc1234' })
  @IsString()
  @IsOptional()
  commitSha?: string;
}
