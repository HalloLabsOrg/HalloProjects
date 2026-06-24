import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@hallo.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'admin123456' })
  @IsString()
  @MinLength(8)
  password!: string;
}
