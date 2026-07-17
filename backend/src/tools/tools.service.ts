import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { ListToolsDto } from './dto/list-tools.dto';
import {
  deriveAvailability,
  nextInLineEmail,
  ToolAvailability,
} from '../common/availability';

@Injectable()
export class ToolsService {
  private readonly logger = new Logger('ToolsService');

  constructor(private prisma: PrismaService) {}

  /**
   * List tools with DERIVED availability + nextInLine.
   * Supports case-insensitive name search (`q`), `category` and derived `status`
   * filters (AND semantics). Availability is computed from live loan/reservation
   * state via the shared availability helper.
   */
  async findAll(query: ListToolsDto) {
    const tools = await this.prisma.tool.findMany({
      where: {
        ...(query.q
          ? { name: { contains: query.q, mode: 'insensitive' } }
          : {}),
        ...(query.category ? { category: query.category } : {}),
      },
      include: {
        loans: { where: { returnedAt: null } },
        reservations: {
          where: { status: 'ACTIVE' },
          include: { user: { select: { email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const shaped = tools.map((tool) => {
      const availability = deriveAvailability(tool.loans, tool.reservations);
      return {
        id: tool.id,
        name: tool.name,
        category: tool.category,
        condition: tool.condition,
        availability,
        nextInLine: nextInLineEmail(tool.reservations),
        createdAt: tool.createdAt,
      };
    });

    if (query.status) {
      return shaped.filter((t) => t.availability === query.status);
    }
    return shaped;
  }

  async findOne(id: string) {
    const tool = await this.prisma.tool.findUnique({
      where: { id },
      include: {
        loans: { where: { returnedAt: null } },
        reservations: {
          where: { status: 'ACTIVE' },
          include: { user: { select: { email: true } } },
        },
      },
    });
    if (!tool) throw new NotFoundException('Tool not found');

    const availability: ToolAvailability = deriveAvailability(
      tool.loans,
      tool.reservations,
    );
    return {
      id: tool.id,
      name: tool.name,
      category: tool.category,
      condition: tool.condition,
      availability,
      nextInLine: nextInLineEmail(tool.reservations),
      createdAt: tool.createdAt,
    };
  }

  async create(dto: CreateToolDto) {
    const tool = await this.prisma.tool.create({ data: dto });
    return {
      id: tool.id,
      name: tool.name,
      category: tool.category,
      condition: tool.condition,
      availability: 'available' as ToolAvailability,
      nextInLine: null,
      createdAt: tool.createdAt,
    };
  }

  async update(id: string, dto: UpdateToolDto) {
    try {
      await this.prisma.tool.update({ where: { id }, data: dto });
    } catch (error) {
      this.handlePrismaError(error, id);
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    try {
      await this.prisma.tool.delete({ where: { id } });
    } catch (error) {
      this.handlePrismaError(error, id);
    }
    return { message: 'Tool deleted' };
  }

  private handlePrismaError(error: unknown, id: string): never {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException('Tool not found');
    }
    this.logger.error(`Tool operation failed for ${id}: ${error}`);
    throw new InternalServerErrorException('Server error');
  }
}
