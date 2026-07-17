import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@generated/prisma/client';
import { Auth } from 'src/auth/decorators';
import { AdminSettingsService } from './admin-settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@ApiTags('Admin Settings')
@ApiBearerAuth()
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'LIST SETTINGS', description: 'Admin only. Masked service settings.' })
  @ApiResponse({ status: 200, description: 'Ok' })
  @Auth(Role.admin)
  list() {
    return this.adminSettingsService.list();
  }

  @Patch()
  @ApiOperation({ summary: 'UPDATE SETTING', description: 'Admin only. Upserts a service setting.' })
  @ApiResponse({ status: 200, description: 'Ok' })
  @Auth(Role.admin)
  update(@Body() dto: UpdateSettingDto) {
    return this.adminSettingsService.update(dto);
  }
}
