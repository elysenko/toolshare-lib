import { Module } from '@nestjs/common';
import { ToolsController } from './tools.controller';
import { ToolsService } from './tools.service';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [ToolsController],
  providers: [ToolsService],
  imports: [AuthModule, PrismaModule],
  exports: [ToolsService],
})
export class ToolsModule {}
