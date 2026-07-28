import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { OrderStatus, PaymentMethod } from '../entities/order.entity';

export class OrderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  createdBy?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
