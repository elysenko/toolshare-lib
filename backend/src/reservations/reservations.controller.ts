import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
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
  findAll(@GetUser() user: User) {
    return this.reservationsService.findAll({ id: user.id, role: user.role });
  }

  @Post()
  @ApiOperation({ summary: 'CREATE RESERVATION', description: 'Authenticated user reserves an on-loan tool.' })
  @ApiResponse({ status: 201, description: 'Created' })
  @Auth(Role.admin, Role.user)
  create(@GetUser() user: User, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(user.id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'CANCEL RESERVATION', description: 'Owner or admin cancels an active reservation.' })
  @ApiResponse({ status: 200, description: 'Ok' })
  @Auth(Role.admin, Role.user)
  cancel(@GetUser() user: User, @Param('id') id: string) {
    return this.reservationsService.cancel({ id: user.id, role: user.role }, id);
  }
}
