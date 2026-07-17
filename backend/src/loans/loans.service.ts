import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ListLoansDto } from './dto/list-loans.dto';
import { loanStatus } from '../common/availability';

type LoanWithTool = {
  id: string;
  toolId: string;
  borrowerName: string;
  borrowerUserId: string | null;
  dueDate: Date;
  returnedAt: Date | null;
  createdAt: Date;
  tool: { name: string };
};

@Injectable()
export class LoansService {
  private readonly logger = new Logger('LoansService');

  constructor(private prisma: PrismaService) {}

  private shape(loan: LoanWithTool) {
    return {
      id: loan.id,
      toolId: loan.toolId,
      toolName: loan.tool.name,
      borrowerName: loan.borrowerName,
      borrowerUserId: loan.borrowerUserId,
      dueDate: loan.dueDate,
      returnedAt: loan.returnedAt,
      createdAt: loan.createdAt,
    };
  }

  /** List loans, optionally filtered by derived status (active/overdue/returned). */
  async findAll(query: ListLoansDto) {
    const now = new Date();
    // Push the status filter into the query where cheap; derive to stay
    // consistent with the shared availability helper.
    const where =
      query.status === 'returned'
        ? { returnedAt: { not: null } }
        : query.status === 'active'
          ? { returnedAt: null, dueDate: { gte: now } }
          : query.status === 'overdue'
            ? { returnedAt: null, dueDate: { lt: now } }
            : {};

    const loans = await this.prisma.loan.findMany({
      where,
      include: { tool: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return loans.map((l) => ({
      ...this.shape(l as LoanWithTool),
      status: loanStatus(l, now),
    }));
  }

  /** Admin: create a loan. Blocks a second open loan on the same tool. */
  async create(dto: CreateLoanDto) {
    const tool = await this.prisma.tool.findUnique({ where: { id: dto.toolId } });
    if (!tool) throw new NotFoundException('Tool not found');

    const openLoan = await this.prisma.loan.findFirst({
      where: { toolId: dto.toolId, returnedAt: null },
    });
    if (openLoan) {
      throw new ConflictException('Tool already has an open loan');
    }

    const loan = await this.prisma.loan.create({
      data: {
        toolId: dto.toolId,
        borrowerName: dto.borrowerName,
        borrowerUserId: dto.borrowerUserId ?? null,
        dueDate: new Date(dto.dueDate),
      },
      include: { tool: { select: { name: true } } },
    });
    return this.shape(loan as LoanWithTool);
  }

  /**
   * Admin: return an open loan. Sets returnedAt; the tool's availability then
   * derives to `reserved` when an ACTIVE reservation exists (FIFO next-in-line),
   * otherwise `available`.
   */
  async returnLoan(id: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.returnedAt) {
      throw new ConflictException('Loan has already been returned');
    }

    const updated = await this.prisma.loan.update({
      where: { id },
      data: { returnedAt: new Date() },
      include: { tool: { select: { name: true } } },
    });

    // Surface the earliest ACTIVE reservation as next-in-line, if any.
    const nextReservation = await this.prisma.reservation.findFirst({
      where: { toolId: loan.toolId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { email: true } } },
    });

    return {
      ...this.shape(updated as LoanWithTool),
      nextInLine: nextReservation?.user?.email ?? null,
    };
  }
}
