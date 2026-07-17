import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { isOpenLoan } from '../common/availability';

/** True when a Prisma error is a unique-constraint (P2002) violation. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === 'P2002'
  );
}

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger('ReservationsService');

  constructor(private prisma: PrismaService) {}

  /**
   * List reservations ordered FIFO by createdAt, with a computed `position`
   * (1 = next in line) among the ACTIVE reservations for each tool.
   *
   * Admins see every reservation; regular users only see their own rows so
   * other members' emails are never exposed.
   */
  async findAll(currentUser: { id: string; role: Role }) {
    const isAdmin = currentUser.role === Role.admin;
    // Fetch every reservation so FIFO position stays correct across all users,
    // then restrict the returned rows to the caller's own when not an admin.
    const reservations = await this.prisma.reservation.findMany({
      include: {
        tool: { select: { name: true } },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // FIFO rank among ACTIVE reservations per tool (computed globally).
    const activeRank = new Map<string, number>();
    const shaped = reservations.map((r) => {
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

    return isAdmin
      ? shaped
      : shaped.filter((r) => r.userId === currentUser.id);
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

    let reservation;
    try {
      reservation = await this.prisma.reservation.create({
        data: { toolId: dto.toolId, userId, status: 'ACTIVE' },
        include: {
          tool: { select: { name: true } },
          user: { select: { email: true } },
        },
      });
    } catch (err) {
      // Backstop for the DB-level partial unique index (one ACTIVE reservation
      // per user per tool) when two requests race past the app-level check.
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'You already have an active reservation for this tool',
        );
      }
      throw err;
    }

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

  /**
   * Cancel an ACTIVE reservation. The owner (or an admin) may cancel it; the
   * row is moved to CANCELLED so the FIFO queue skips it. Idempotency is not
   * assumed — cancelling an already-closed reservation is a 409.
   */
  async cancel(currentUser: { id: string; role: Role }, id: string) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        tool: { select: { name: true } },
        user: { select: { email: true } },
      },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    const isAdmin = currentUser.role === Role.admin;
    if (!isAdmin && reservation.userId !== currentUser.id) {
      throw new ForbiddenException('You can only cancel your own reservations');
    }
    if (reservation.status !== 'ACTIVE') {
      throw new ConflictException('Only active reservations can be cancelled');
    }

    const updated = await this.prisma.reservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        tool: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    return {
      id: updated.id,
      toolId: updated.toolId,
      toolName: updated.tool.name,
      userId: updated.userId,
      userEmail: updated.user.email,
      status: updated.status,
      position: 0,
      createdAt: updated.createdAt,
    };
  }
}
