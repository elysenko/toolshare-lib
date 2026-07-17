import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ description: 'Tool to reserve (must currently be on loan)', example: 'a1b2c3' })
  @IsString()
  @IsNotEmpty()
  toolId: string;
}
