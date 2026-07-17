import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { daysOverdue } from '../common/availability';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Overdue watchlist: open (unreturned) loans past their due date, each with a
   * positive `daysOverdue` derived by the shared availability helper — consistent
   * with GET /loans?status=overdue.
   */
  async overdue() {
    const now = new Date();
    const loans = await this.prisma.loan.findMany({
      where: { returnedAt: null, dueDate: { lt: now } },
      include: { tool: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    });

    return loans.map((loan) => ({
      id: loan.id,
      toolId: loan.toolId,
      toolName: loan.tool.name,
      borrowerName: loan.borrowerName,
      dueDate: loan.dueDate,
      daysOverdue: daysOverdue(loan, now),
      // aliases for the derived surface contract ({ tool, borrower, ... })
      tool: loan.tool.name,
      borrower: loan.borrowerName,
    }));
  }
}
