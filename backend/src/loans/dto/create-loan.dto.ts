import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLoanDto {
  @ApiProperty({ description: 'Tool being lent', example: 'a1b2c3' })
  @IsString()
  @IsNotEmpty()
  toolId: string;

  @ApiProperty({ description: 'Free-text borrower name', example: 'Alex' })
  @IsString()
  @IsNotEmpty()
  borrowerName: string;

  @ApiProperty({ description: 'Due date (ISO 8601)', example: '2026-08-01T00:00:00.000Z' })
  @IsDateString({}, { message: 'dueDate must be a valid ISO date' })
  dueDate: string;

  @ApiPropertyOptional({ description: 'Optional linked user id for the borrower' })
  @IsOptional()
  @IsString()
  borrowerUserId?: string;
}
