import { BadRequestException } from '@nestjs/common';
import { PaymentMethod } from '../orders/entities/order.entity';
import { ShiftsService } from './shifts.service';
import { Shift, ShiftStatus } from './entities/shift.entity';

describe('ShiftsService business rules', () => {
  it('không cho mở hai ca cùng lúc', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      }),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new ShiftsService({} as any, {} as any, dataSource as any);
    await expect(service.start(2, 100000)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('chốt ca tính đúng tiền dự kiến và chênh lệch', async () => {
    const shift: any = {
      id: 3,
      staffId: 2,
      openingCash: '500000',
      status: ShiftStatus.OPEN,
    };
    const orders = {
      find: jest.fn().mockResolvedValue([
        {
          totalAmount: '100000',
          paymentMethod: PaymentMethod.CASH,
          items: [{ quantity: 2 }],
        },
        {
          totalAmount: '50000',
          paymentMethod: PaymentMethod.TRANSFER,
          items: [{ quantity: 1 }],
        },
      ]),
    };
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(shift),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === Shift
          ? { createQueryBuilder: jest.fn().mockReturnValue(queryBuilder) }
          : orders,
      ),
      save: jest.fn(async (value) => value),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    const service = new ShiftsService(
      {} as any,
      orders as any,
      dataSource as any,
    );
    const result = await service.end(2, 590000);
    expect(result.expectedCash).toBe(600000);
    expect(result.difference).toBe(-10000);
    expect(result.totalRevenue).toBe(150000);
    expect(result.status).toBe(ShiftStatus.CLOSED);
  });

  it('trả thống kê 0 khi chưa mở ca', async () => {
    const service = new ShiftsService(
      {} as any,
      { find: jest.fn() } as any,
      {} as any,
    );
    await expect(service.summary(2, null)).resolves.toEqual({
      totalRevenue: 0,
      totalOrders: 0,
      totalItems: 0,
      cash: 0,
      transfer: 0,
    });
  });
});
