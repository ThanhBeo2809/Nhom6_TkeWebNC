import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { InventoryService } from './inventory.service';
import { AddStockDto } from './dto/add-stock.dto';
import { InventoryHistoryQueryDto } from './dto/inventory-history-query.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Patch(':id/add-stock')
  addStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddStockDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.inventoryService.addStock(id, dto, req.user.id);
  }

  @Get('history')
  findHistory(@Query() query: InventoryHistoryQueryDto) {
    return this.inventoryService.findHistory(query);
  }
}
