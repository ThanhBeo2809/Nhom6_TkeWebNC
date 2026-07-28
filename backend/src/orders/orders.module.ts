import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { Shift } from '../shifts/entities/shift.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Shift]),
    InventoryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
