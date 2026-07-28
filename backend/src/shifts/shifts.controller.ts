import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EndShiftDto, StartShiftDto } from './dto/shift.dto';
import { ShiftsService } from './shifts.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AdminShiftQueryDto, ForceCloseShiftDto } from './dto/admin-shift.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request';
@Controller('shifts')
@UseGuards(JwtAuthGuard)
export class ShiftsController {
  constructor(private service: ShiftsService) {}
  @Get('current') current(@Request() req: AuthenticatedRequest) {
    return this.service.current(req.user.id);
  }
  @Post('start')
  start(@Request() req: AuthenticatedRequest, @Body() dto: StartShiftDto) {
    return this.service.start(req.user.id, dto.openingCash);
  }
  @Post('end')
  end(@Request() req: AuthenticatedRequest, @Body() dto: EndShiftDto) {
    return this.service.end(req.user.id, dto.actualCash);
  }
  @Get('my-summary')
  async summary(@Request() req: AuthenticatedRequest) {
    return this.service.summary(
      req.user.id,
      await this.service.current(req.user.id),
    );
  }
  @Get('history') history(@Request() req: AuthenticatedRequest) {
    return this.service.history(req.user.id);
  }
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminList(@Query() query: AdminShiftQueryDto) {
    return this.service.adminList(query);
  }
  @Get('admin/:id/orders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  shiftOrders(@Param('id', ParseIntPipe) id: number) {
    return this.service.shiftOrders(id);
  }
  @Patch('admin/:id/force-close')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  forceClose(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ForceCloseShiftDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.forceClose(id, req.user.id, dto.actualCash, dto.reason);
  }
}
