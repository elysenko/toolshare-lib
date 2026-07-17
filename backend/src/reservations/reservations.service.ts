import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { isOpenLoan } from '../common/availability';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger('ReservationsService');

  constructor(private prisma: PrismaService) {}

  /**
   * List reservations ordered FIFO by createdAt, with a computed `position`
   * (1 = next in line) among the ACTIVE reservations for each tool.
   */
  async findAll() {
    const reservations = await this.prisma.reservation.findMany({
      include: {
        tool: { select: { name: true } },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // FIFO rank among ACTIVE reservations per tool.
    const activeRank = new Map<string, number>();
    return reservations.map((r) => {
      let position = 0;
      if (r.status === 'ACTIVE') {
        const next = (activeRank.get(r.toolId) ?? 0) + 1;
        activeRank.set(r.toolId, next);
        position = next;
      }
      return {
        id: r.id,
        toolId: r.toolId,
        toolName: r.tool.name,
        userId: r.userId,
        userEmail: r.user.email,
        status: r.status,
        position,
        createdAt: r.createdAt,
      };
    });
  }

  /**
   * USER reserves a tool that is currently on loan. Enforces:
   *  - tool must exist (404)
   *  - tool must be on loan / not available (409)
   *  - one ACTIVE reservation per user per tool (409)
   */
  async create(userId: string, dto: CreateReservationDto) {
    const tool = await this.prisma.tool.findUnique({
      where: { id: dto.toolId },
      include: { loans: { where: { returnedAt: null } } },
    });
    if (!tool) throw new NotFoundException('Tool not found');

    const onLoan = tool.loans.some(isOpenLoan);
    if (!onLoan) {
      throw new ConflictException('Only tools currently on loan can be reserved');
    }

    const existing = await this.prisma.reservation.findFirst({
      where: { toolId: dto.toolId, userId, status: 'ACTIVE' },
    });
    if (existing) {
      throw new ConflictException('You already have an active reservation for this tool');
    }

    const reservation = await this.prisma.reservation.create({
      data: { toolId: dto.toolId, userId, status: 'ACTIVE' },
      include: {
        tool: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    const position = await this.prisma.reservation.count({
      where: {
        toolId: dto.toolId,
        status: 'ACTIVE',
        createdAt: { lte: reservation.createdAt },
      },
    });

    return {
      id: reservation.id,
      toolId: reservation.toolId,
      toolName: reservation.tool.name,
      userId: reservation.userId,
      userEmail: reservation.user.email,
      status: reservation.status,
      position,
      createdAt: reservation.createdAt,
    };
  }
}
