import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [LoansController],
  providers: [LoansService],
  imports: [AuthModule, PrismaModule],
  exports: [LoansService],
})
export class LoansModule {}
