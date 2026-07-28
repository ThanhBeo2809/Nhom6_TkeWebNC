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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderQueryDto } from './dto/order-query.dto';
import {
  CancelOrderDto,
  CancelRequestDto,
  RejectCancelDto,
} from './dto/cancel-request.dto';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @Request() req: AuthenticatedRequest) {
    return this.ordersService.create(dto, req.user.id, req.user.role);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest, @Query() query: OrderQueryDto) {
    return this.ordersService.findAll(req.user.id, req.user.role, query);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ordersService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ordersService.cancel(
      id,
      req.user.id,
      req.user.role,
      dto.reason,
    );
  }

  @Post(':id/cancel-request')
  requestCancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelRequestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ordersService.requestCancel(
      id,
      req.user.id,
      req.user.role,
      dto.reason,
    );
  }

  @Patch(':id/cancel-request/approve')
  approveCancel(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ordersService.approveCancel(id, req.user.id, req.user.role);
  }

  @Patch(':id/cancel-request/reject')
  rejectCancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectCancelDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.ordersService.rejectCancel(
      id,
      req.user.id,
      req.user.role,
      dto.reason,
    );
  }
}
