import { Module } from '@nestjs/common';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from './admin-settings.service';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [AdminSettingsController],
  providers: [AdminSettingsService],
  imports: [AuthModule, PrismaModule],
})
export class AdminSettingsModule {}
