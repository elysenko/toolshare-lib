import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@generated/prisma/client';
import { Auth } from 'src/auth/decorators';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ListLoansDto } from './dto/list-loans.dto';

@ApiTags('Loans')
@ApiBearerAuth()
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  @ApiOperation({ summary: 'LIST LOANS', description: 'Authenticated. Filter by status=active|overdue|returned.' })
  @ApiResponse({ status: 200, description: 'Ok' })
  @Auth(Role.admin, Role.user)
  findAll(@Query() query: ListLoansDto) {
    return this.loansService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: 'CREATE LOAN', description: 'Admin only. Marks the tool on-loan.' })
  @ApiResponse({ status: 201, description: 'Created' })
  @Auth(Role.admin)
  create(@Body() dto: CreateLoanDto) {
    return this.loansService.create(dto);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'RETURN LOAN', description: 'Admin only. Closes the loan and frees the tool.' })
  @ApiResponse({ status: 200, description: 'Ok' })
  @Auth(Role.admin)
  returnLoan(@Param('id') id: string) {
    return this.loansService.returnLoan(id);
  }
}
