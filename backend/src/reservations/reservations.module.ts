import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService],
  imports: [AuthModule, PrismaModule],
  exports: [ReservationsService],
})
export class ReservationsModule {}
