import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CancelRequestStatus,
  Order,
  OrderStatus,
  PaymentMethod,
} from './entities/order.entity';
import { UserRole } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { Shift, ShiftStatus } from '../shifts/entities/shift.entity';

describe('OrdersService business rules', () => {
  const product = {
    id: 1,
    name: 'Nước suối',
    price: 1000,
    costPrice: 600,
    stock: 10,
    isActive: true,
  };

  const buildService = () => {
    const products = [{ ...product }];
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(products),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      }),
      create: jest.fn((_entity, data) => ({ ...data })),
      save: jest.fn(async (first, second) => {
        if (second) return second;
        if (first.totalAmount !== undefined && !first.id)
          return { ...first, id: 99 };
        return first;
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const orderRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 99 }),
      createQueryBuilder: jest.fn(),
    };
    const inventoryService = {
      recordMovement: jest.fn().mockResolvedValue(undefined),
    };
    const shiftRepo = { findOne: jest.fn().mockResolvedValue(null) };
    return {
      service: new OrdersService(
        orderRepo as any,
        shiftRepo as any,
        dataSource as any,
        inventoryService as any,
      ),
      products,
      orderRepo,
      inventoryService,
    };
  };

  it('gộp sản phẩm trùng và chỉ trừ kho một lần', async () => {
    const { service, products, inventoryService } = buildService();
    await service.create(
      {
        items: [
          { productId: 1, quantity: 1 },
          { productId: 1, quantity: 2 },
        ],
        paymentMethod: PaymentMethod.CASH,
        amountPaid: 5000,
      },
      7,
    );

    expect(products[0].stock).toBe(7);
    expect(inventoryService.recordMovement).toHaveBeenCalledTimes(1);
    expect(inventoryService.recordMovement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ quantity: 3, stockBefore: 10, stockAfter: 7 }),
    );
  });

  it('không cho thanh toán tiền mặt khi khách đưa thiếu', async () => {
    const { service, products, inventoryService } = buildService();
    await expect(
      service.create(
        {
          items: [{ productId: 1, quantity: 2 }],
          paymentMethod: PaymentMethod.CASH,
          amountPaid: 1000,
        },
        7,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(products[0].stock).toBe(10);
    expect(inventoryService.recordMovement).not.toHaveBeenCalled();
  });

  it('staff chỉ truy vấn hóa đơn do chính mình tạo', async () => {
    const { service, orderRepo } = buildService();
    orderRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.findOne(5, 7, UserRole.STAFF)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(orderRepo.findOne).toHaveBeenCalledWith({
      where: { id: 5, createdBy: 7 },
    });
  });

  it('admin được truy vấn hóa đơn bất kỳ', async () => {
    const { service, orderRepo } = buildService();
    await service.findOne(5, 1, UserRole.ADMIN);
    expect(orderRepo.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it('không cho nhân viên hủy trực tiếp hóa đơn', async () => {
    const { service } = buildService();
    await expect(
      service.cancel(5, 7, UserRole.STAFF, 'Khách trả hàng'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('yêu cầu hủy của staff chỉ chuyển sang chờ duyệt, chưa hủy hóa đơn', async () => {
    const order: any = {
      id: 5,
      createdBy: 7,
      status: OrderStatus.COMPLETED,
      cancelRequestStatus: CancelRequestStatus.NONE,
      cancelledAt: null,
    };
    const orderQuery = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(order),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(orderQuery),
      }),
      save: jest.fn(async (value) => value),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    const inventoryService = {
      recordMovement: jest.fn().mockResolvedValue(undefined),
    };
    const service = new OrdersService(
      {} as any,
      {} as any,
      dataSource as any,
      inventoryService as any,
    );

    await service.requestCancel(
      order.id,
      order.createdBy,
      UserRole.STAFF,
      'Khách nhập nhầm sản phẩm',
    );

    expect(order.status).toBe(OrderStatus.COMPLETED);
    expect(order.cancelRequestStatus).toBe(CancelRequestStatus.PENDING);
    expect(order.cancelReason).toBe('Khách nhập nhầm sản phẩm');
    expect(order.cancelledAt).toBeNull();
    expect(inventoryService.recordMovement).not.toHaveBeenCalled();
  });

  it('duyệt hủy cập nhật kho, thông tin kiểm toán và số liệu ca đã đóng', async () => {
    const order: any = {
      id: 15,
      status: OrderStatus.COMPLETED,
      cancelRequestStatus: CancelRequestStatus.PENDING,
      cancelReason: 'Khách thanh toán nhầm',
      shiftId: 4,
      items: [{ productId: 1, quantity: 2 }],
    };
    const productToRestore = { ...product, stock: 8 };
    const closedShift: any = {
      id: 4,
      staffId: 7,
      status: ShiftStatus.CLOSED,
      openingCash: '100000',
      actualCash: '150000',
    };
    const remainingOrders = [
      { totalAmount: '30000', paymentMethod: PaymentMethod.CASH },
      { totalAmount: '20000', paymentMethod: PaymentMethod.TRANSFER },
    ];
    const orderQuery = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(order),
    };
    const productQuery = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([productToRestore]),
    };
    const shiftQuery = {
      where: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(closedShift),
    };
    const orderRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(orderQuery),
      find: jest.fn().mockResolvedValue(remainingOrders),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Order) return orderRepository;
        if (entity === Product) {
          return {
            createQueryBuilder: jest.fn().mockReturnValue(productQuery),
          };
        }
        if (entity === Shift) {
          return { createQueryBuilder: jest.fn().mockReturnValue(shiftQuery) };
        }
        return {};
      }),
      save: jest.fn(async (value) => value),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    const inventoryService = {
      recordMovement: jest.fn().mockResolvedValue(undefined),
    };
    const service = new OrdersService(
      {} as any,
      {} as any,
      dataSource as any,
      inventoryService as any,
    );

    await service.approveCancel(15, 1, UserRole.ADMIN);

    expect(order.status).toBe(OrderStatus.CANCELLED);
    expect(order.cancelRequestStatus).toBe(CancelRequestStatus.APPROVED);
    expect(order.cancelApprovedBy).toBe(1);
    expect(order.cancelledAt).toBeInstanceOf(Date);
    expect(productToRestore.stock).toBe(10);
    expect(inventoryService.recordMovement).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        productId: 1,
        quantity: 2,
        referenceId: 15,
      }),
    );
    expect(closedShift.totalRevenue).toBe(50000);
    expect(closedShift.cashSales).toBe(30000);
    expect(closedShift.transferSales).toBe(20000);
    expect(closedShift.totalOrders).toBe(2);
    expect(closedShift.expectedCash).toBe(130000);
    expect(closedShift.difference).toBe(20000);
  });
});
