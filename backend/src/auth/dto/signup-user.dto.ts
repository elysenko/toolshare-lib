import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Signup payload. Deliberately minimal ({ email, password }) to match the
 * frontend/login contract; `name` is optional and defaults from the email.
 * The first account created in an empty user table becomes ADMIN.
 */
export class SignupUserDto {
  @ApiProperty({ example: 'admin@toolshare.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'pw123456', description: 'Min 6 characters' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: 'Admin' })
  @IsOptional()
  @IsString()
  name?: string;
}
