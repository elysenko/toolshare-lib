import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@generated/prisma/client';
import { Auth } from 'src/auth/decorators';
import { ToolsService } from './tools.service';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { ListToolsDto } from './dto/list-tools.dto';

@ApiTags('Tools')
@ApiBearerAuth()
@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  @ApiOperation({ summary: 'LIST TOOLS', description: 'Authenticated. Filter by q/category/status. Returns derived availability.' })
  @ApiResponse({ status: 200, description: 'Ok' })
  @Auth(Role.admin, Role.user)
  findAll(@Query() query: ListToolsDto) {
    return this.toolsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'GET TOOL', description: 'Authenticated. Single tool with derived availability.' })
  @Auth(Role.admin, Role.user)
  findOne(@Param('id') id: string) {
    return this.toolsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'CREATE TOOL', description: 'Admin only.' })
  @ApiResponse({ status: 201, description: 'Created' })
  @Auth(Role.admin)
  create(@Body() dto: CreateToolDto) {
    return this.toolsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'UPDATE TOOL', description: 'Admin only. Partial update.' })
  @Auth(Role.admin)
  update(@Param('id') id: string, @Body() dto: UpdateToolDto) {
    return this.toolsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'DELETE TOOL', description: 'Admin only.' })
  @Auth(Role.admin)
  remove(@Param('id') id: string) {
    return this.toolsService.remove(id);
  }
}
