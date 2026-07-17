import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@generated/prisma/client';
import { Auth } from 'src/auth/decorators';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overdue')
  @ApiOperation({ summary: 'OVERDUE WATCHLIST', description: 'Authenticated. Open loans past due with daysOverdue.' })
  @ApiResponse({ status: 200, description: 'Ok' })
  @Auth(Role.admin, Role.user)
  overdue() {
    return this.dashboardService.overdue();
  }
}
