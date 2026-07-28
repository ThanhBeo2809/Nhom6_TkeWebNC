import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  Order,
  OrderStatus,
  PaymentMethod,
} from '../orders/entities/order.entity';
import { Shift, ShiftStatus } from './entities/shift.entity';
import { AdminShiftQueryDto } from './dto/admin-shift.dto';
@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift) private shifts: Repository<Shift>,
    @InjectRepository(Order) private orders: Repository<Order>,
    private dataSource: DataSource,
  ) {}
  current(staffId: number) {
    return this.shifts.findOne({
      where: { staffId, status: ShiftStatus.OPEN },
    });
  }
  async start(staffId: number, openingCash: number) {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager
        .getRepository(Shift)
        .createQueryBuilder('shift')
        .where('shift.staffId = :staffId', { staffId })
        .andWhere('shift.status = :status', { status: ShiftStatus.OPEN })
        .setLock('pessimistic_write')
        .getOne();
      if (existing)
        throw new BadRequestException('Bạn đang có một ca chưa kết thúc');
      return manager.save(manager.create(Shift, { staffId, openingCash }));
    });
  }
  async summary(staffId: number, shift?: Shift | null) {
    if (!shift) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalItems: 0,
        cash: 0,
        transfer: 0,
      };
    }
    return this.calculateSummary(this.orders, staffId, shift.id);
  }
  private async calculateSummary(
    ordersRepo: Repository<Order>,
    staffId: number,
    shiftId: number,
  ) {
    const orders = await ordersRepo.find({
      where: { shiftId, createdBy: staffId, status: OrderStatus.COMPLETED },
    });
    const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const cash = orders
      .filter((o) => o.paymentMethod === PaymentMethod.CASH)
      .reduce((s, o) => s + Number(o.totalAmount), 0);
    return {
      totalRevenue,
      totalOrders: orders.length,
      totalItems: orders
        .flatMap((o) => o.items || [])
        .reduce((s, i) => s + i.quantity, 0),
      cash,
      transfer: totalRevenue - cash,
    };
  }
  async end(staffId: number, actualCash: number) {
    return this.dataSource.transaction(async (manager) => {
      const shift = await this.findOpenShiftForUpdate(manager, staffId);
      if (!shift) throw new BadRequestException('Không có ca đang mở');
      const report = await this.calculateSummary(
        manager.getRepository(Order),
        staffId,
        shift.id,
      );
      shift.expectedCash = Number(shift.openingCash) + report.cash;
      shift.actualCash = actualCash;
      shift.totalRevenue = report.totalRevenue;
      shift.totalOrders = report.totalOrders;
      shift.cashSales = report.cash;
      shift.transferSales = report.transfer;
      shift.difference = actualCash - shift.expectedCash;
      shift.status = ShiftStatus.CLOSED;
      shift.endedAt = new Date();
      return manager.save(shift);
    });
  }
  history(staffId: number) {
    return this.shifts.find({
      where: { staffId },
      order: { startedAt: 'DESC' },
      take: 20,
    });
  }
  adminList(query: AdminShiftQueryDto) {
    const qb = this.shifts
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.staff', 'staff')
      .orderBy('shift.startedAt', 'DESC');
    if (query.staffId)
      qb.andWhere('shift.staffId = :staffId', { staffId: query.staffId });
    if (query.status)
      qb.andWhere('shift.status = :status', { status: query.status });
    if (query.from)
      qb.andWhere('shift.startedAt >= :from', {
        from: `${query.from}T00:00:00`,
      });
    if (query.to) {
      const toExclusive = new Date(`${query.to}T00:00:00`);
      toExclusive.setDate(toExclusive.getDate() + 1);
      qb.andWhere('shift.startedAt < :toExclusive', { toExclusive });
    }
    return qb.getMany();
  }
  shiftOrders(id: number) {
    return this.orders.find({
      where: { shiftId: id },
      order: { createdAt: 'DESC' },
    });
  }
  async forceClose(
    id: number,
    adminId: number,
    actualCash: number,
    reason: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const shift = await manager
        .getRepository(Shift)
        .createQueryBuilder('shift')
        .where('shift.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();
      if (!shift) throw new BadRequestException('Ca làm không tồn tại');
      if (shift.status !== ShiftStatus.OPEN)
        throw new BadRequestException('Ca đã được đóng');
      const report = await this.calculateSummary(
        manager.getRepository(Order),
        shift.staffId,
        shift.id,
      );
      shift.expectedCash = Number(shift.openingCash) + report.cash;
      shift.actualCash = actualCash;
      shift.difference = actualCash - shift.expectedCash;
      shift.totalRevenue = report.totalRevenue;
      shift.totalOrders = report.totalOrders;
      shift.cashSales = report.cash;
      shift.transferSales = report.transfer;
      shift.status = ShiftStatus.CLOSED;
      shift.endedAt = new Date();
      shift.closedBy = adminId;
      shift.closeNote = reason.trim();
      return manager.save(shift);
    });
  }

  private findOpenShiftForUpdate(manager: EntityManager, staffId: number) {
    return manager
      .getRepository(Shift)
      .createQueryBuilder('shift')
      .where('shift.staffId = :staffId', { staffId })
      .andWhere('shift.status = :status', { status: ShiftStatus.OPEN })
      .setLock('pessimistic_write')
      .getOne();
  }
}
