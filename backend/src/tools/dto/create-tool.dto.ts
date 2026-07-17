import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ToolCategory, ToolCondition } from '@generated/prisma/client';

export class CreateToolDto {
  @ApiProperty({ example: 'Cordless Drill', description: 'Tool name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ToolCategory, example: 'Power' })
  @IsEnum(ToolCategory, { message: 'category must be one of Power, Hand, Garden, Measurement' })
  category: ToolCategory;

  @ApiProperty({ enum: ToolCondition, example: 'Good' })
  @IsEnum(ToolCondition, { message: 'condition must be one of New, Good, Fair, Worn' })
  condition: ToolCondition;
}
