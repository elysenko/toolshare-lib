import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@generated/prisma/client';
import { Auth, GetUser } from 'src/auth/decorators';
import { User } from 'src/user/entities/user.entity';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@ApiTags('Reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'LIST RESERVATIONS', description: 'Authenticated. FIFO-ordered with computed position.' })
  @ApiResponse({ status: 200, description: 'Ok' })
  @Auth(Role.admin, Role.user)
  findAll() {
    return this.reservationsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'CREATE RESERVATION', description: 'Authenticated user reserves an on-loan tool.' })
  @ApiResponse({ status: 201, description: 'Created' })
  @Auth(Role.admin, Role.user)
  create(@GetUser() user: User, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(user.id, dto);
  }
}
