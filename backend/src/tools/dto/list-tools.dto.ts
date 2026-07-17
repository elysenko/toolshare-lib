import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { ToolCategory } from '@generated/prisma/client';

export type ToolAvailabilityFilter = 'available' | 'on_loan' | 'reserved';

export class ListToolsDto {
  @ApiPropertyOptional({ description: 'Case-insensitive substring match on tool name' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ToolCategory })
  @IsOptional()
  @IsEnum(ToolCategory, { message: 'category must be one of Power, Hand, Garden, Measurement' })
  category?: ToolCategory;

  @ApiPropertyOptional({ enum: ['available', 'on_loan', 'reserved'] })
  @IsOptional()
  @IsIn(['available', 'on_loan', 'reserved'], {
    message: 'status must be one of available, on_loan, reserved',
  })
  status?: ToolAvailabilityFilter;
}
