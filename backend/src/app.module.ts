import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { validateConfig } from './common/config/env.config';
import { HealthModule } from './health/health.module';
import { ToolsModule } from './tools/tools.module';
import { LoansModule } from './loans/loans.module';
import { ReservationsModule } from './reservations/reservations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminSettingsModule } from './admin-settings/admin-settings.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => validateConfig(config),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: config.get<number>('THROTTLE_TTL', 60000),
        limit: config.get<number>('THROTTLE_LIMIT', 100),
      }],
    }),
    AuthModule,
    PrismaModule,
    UserModule,
    HealthModule,
    ToolsModule,
    LoansModule,
    ReservationsModule,
    DashboardModule,
    AdminSettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
