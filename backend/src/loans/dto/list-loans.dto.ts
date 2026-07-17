import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export type LoanStatusFilter = 'active' | 'overdue' | 'returned';

export class ListLoansDto {
  @ApiPropertyOptional({ enum: ['active', 'overdue', 'returned'] })
  @IsOptional()
  @IsIn(['active', 'overdue', 'returned'], {
    message: 'status must be one of active, overdue, returned',
  })
  status?: LoanStatusFilter;
}
