import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderFilterStatus, OrderQueryDto } from './dto/order-query.dto';
import { OrderItem } from './entities/order-item.entity';
import {
  CancelRequestStatus,
  Order,
  OrderStatus,
  PaymentMethod,
} from './entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { UserRole } from '../users/entities/user.entity';
import { InventoryService } from '../inventory/inventory.service';
import { InventoryTransactionType } from '../inventory/entities/inventory-transaction.entity';
import { Shift, ShiftStatus } from '../shifts/entities/shift.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Shift) private shiftRepo: Repository<Shift>,
    private dataSource: DataSource,
    private inventoryService: InventoryService,
  ) {}

  async create(
    dto: CreateOrderDto,
    userId: number,
    role: UserRole = UserRole.ADMIN,
  ) {
    const activeShift =
      role === UserRole.STAFF
        ? await this.shiftRepo.findOne({
            where: { staffId: userId, status: ShiftStatus.OPEN },
          })
        : null;
    if (role === UserRole.STAFF && !activeShift) {
      throw new BadRequestException(
        'Bạn phải bắt đầu ca làm việc trước khi bán hàng',
      );
    }
    const normalizedItems = Array.from(
      dto.items.reduce((map, item) => {
        map.set(item.productId, (map.get(item.productId) || 0) + item.quantity);
        return map;
      }, new Map<number, number>()),
      ([productId, quantity]) => ({ productId, quantity }),
    );

    const orderId = await this.dataSource.transaction(async (manager) => {
      const productIds = normalizedItems.map((item) => item.productId);
      const products = await manager
        .getRepository(Product)
        .createQueryBuilder('product')
        .where('product.id IN (:...productIds)', { productIds })
        .setLock('pessimistic_write')
        .getMany();

      if (products.length !== productIds.length) {
        throw new BadRequestException('Một hoặc nhiều sản phẩm không tồn tại');
      }

      const productById = new Map(
        products.map((product) => [product.id, product]),
      );
      let totalAmount = 0;
      const itemsData: Array<Partial<OrderItem>> = [];

      for (const item of normalizedItems) {
        const product = productById.get(item.productId)!;
        if (!product.isActive) {
          throw new BadRequestException(`${product.name} đã ngừng bán`);
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `${product.name} không đủ tồn kho (còn ${product.stock})`,
          );
        }

        itemsData.push({
          productId: product.id,
          quantity: item.quantity,
          priceAtTime: product.price,
          costAtTime: product.costPrice,
        });
        totalAmount += Number(product.price) * item.quantity;
      }

      const amountPaid =
        dto.paymentMethod === PaymentMethod.TRANSFER
          ? totalAmount
          : Number(dto.amountPaid || 0);
      if (
        dto.paymentMethod === PaymentMethod.CASH &&
        amountPaid < totalAmount
      ) {
        throw new BadRequestException('Số tiền khách đưa chưa đủ thanh toán');
      }

      const order = await manager.save(
        manager.create(Order, {
          totalAmount,
          createdBy: userId,
          status: OrderStatus.COMPLETED,
          paymentMethod: dto.paymentMethod,
          amountPaid,
          changeAmount: Math.max(amountPaid - totalAmount, 0),
          note: dto.note?.trim() || null,
          shiftId: activeShift?.id || null,
        }),
      );

      await manager.save(
        OrderItem,
        itemsData.map((item) =>
          manager.create(OrderItem, {
            ...item,
            orderId: order.id,
          }),
        ),
      );

      for (const item of normalizedItems) {
        const product = productById.get(item.productId)!;
        const stockBefore = product.stock;
        product.stock -= item.quantity;
        await manager.save(product);
        await this.inventoryService.recordMovement(manager, {
          productId: product.id,
          type: InventoryTransactionType.SALE,
          quantity: item.quantity,
          stockBefore,
          stockAfter: product.stock,
          createdBy: userId,
          referenceId: order.id,
          note: `Bán hàng - hóa đơn #${order.id}`,
        });
      }

      return order.id;
    });

    return this.orderRepo.findOne({ where: { id: orderId } });
  }

  findAll(userId: number, role: UserRole, query: OrderQueryDto) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'Ngày bắt đầu không được sau ngày kết thúc',
      );
    }

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .orderBy('order.createdAt', 'DESC');

    if (role !== UserRole.ADMIN) {
      qb.andWhere('order.createdBy = :userId', { userId });
    } else if (query.createdBy) {
      qb.andWhere('order.createdBy = :createdBy', {
        createdBy: query.createdBy,
      });
    }
    if (query.orderId)
      qb.andWhere('order.id = :orderId', { orderId: query.orderId });
    if (query.status === OrderFilterStatus.PENDING) {
      qb.andWhere('order.status = :status', {
        status: OrderStatus.COMPLETED,
      });
      qb.andWhere('order.cancelRequestStatus = :cancelRequestStatus', {
        cancelRequestStatus: CancelRequestStatus.PENDING,
      });
    } else if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
      if (query.status === OrderFilterStatus.COMPLETED) {
        qb.andWhere('order.cancelRequestStatus != :pendingStatus', {
          pendingStatus: CancelRequestStatus.PENDING,
        });
      }
    }
    if (query.paymentMethod) {
      qb.andWhere('order.paymentMethod = :paymentMethod', {
        paymentMethod: query.paymentMethod,
      });
    }
    if (query.from) {
      qb.andWhere('order.createdAt >= :from', {
        from: `${query.from}T00:00:00`,
      });
    }
    if (query.to) {
      const toExclusive = new Date(`${query.to}T00:00:00`);
      toExclusive.setDate(toExclusive.getDate() + 1);
      qb.andWhere('order.createdAt < :toExclusive', { toExclusive });
    }
    return qb.getMany();
  }

  async findOne(id: number, userId: number, role: UserRole) {
    const order =
      role === UserRole.ADMIN
        ? await this.orderRepo.findOne({ where: { id } })
        : await this.orderRepo.findOne({ where: { id, createdBy: userId } });

    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    return order;
  }

  async cancel(id: number, userId: number, role: UserRole, reason: string) {
    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException('Chỉ quản lý mới được hủy đơn');
    }

    await this.dataSource.transaction((manager) =>
      this.cancelInTransaction(manager, id, userId, reason.trim(), false),
    );

    return { message: 'Hủy đơn và hoàn kho thành công' };
  }

  async requestCancel(
    id: number,
    userId: number,
    role: UserRole,
    reason: string,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const qb = manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .where('order.id = :id', { id })
        .setLock('pessimistic_write');
      if (role !== UserRole.ADMIN) {
        qb.andWhere('order.createdBy = :userId', { userId });
      }
      const order = await qb.getOne();
      if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
      if (order.status !== OrderStatus.COMPLETED) {
        throw new BadRequestException('Chỉ yêu cầu hủy đơn đang hoàn thành');
      }
      if (order.cancelRequestStatus === CancelRequestStatus.PENDING) {
        throw new BadRequestException('Đơn đã có yêu cầu chờ duyệt');
      }
      order.cancelRequestStatus = CancelRequestStatus.PENDING;
      order.cancelReason = reason.trim();
      order.cancelRequestedBy = userId;
      order.cancelRequestedAt = new Date();
      order.cancelReviewedBy = null;
      order.cancelReviewedAt = null;
      order.cancelRejectionReason = null;
      await manager.save(order);
    });
    return { message: 'Đã gửi yêu cầu hủy hóa đơn' };
  }

  async approveCancel(id: number, adminId: number, role: UserRole) {
    if (role !== UserRole.ADMIN)
      throw new ForbiddenException('Chỉ Admin được duyệt yêu cầu');
    await this.dataSource.transaction((manager) =>
      this.cancelInTransaction(manager, id, adminId, null, true),
    );
    return { message: 'Đã duyệt hủy và hoàn kho' };
  }

  async rejectCancel(
    id: number,
    adminId: number,
    role: UserRole,
    rejectionReason: string,
  ) {
    if (role !== UserRole.ADMIN)
      throw new ForbiddenException('Chỉ Admin được từ chối yêu cầu');
    await this.dataSource.transaction(async (manager) => {
      const order = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .where('order.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();
      if (!order || order.cancelRequestStatus !== CancelRequestStatus.PENDING) {
        throw new BadRequestException('Không có yêu cầu hủy đang chờ');
      }
      order.cancelRequestStatus = CancelRequestStatus.REJECTED;
      order.cancelReviewedBy = adminId;
      order.cancelReviewedAt = new Date();
      order.cancelRejectionReason = rejectionReason.trim();
      await manager.save(order);
    });
    return { message: 'Đã từ chối yêu cầu hủy' };
  }

  private async cancelInTransaction(
    manager: EntityManager,
    id: number,
    adminId: number,
    directReason: string | null,
    requirePendingRequest: boolean,
  ) {
    const order = await manager
      .getRepository(Order)
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .where('order.id = :id', { id })
      .setLock('pessimistic_write')
      .getOne();

    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Đơn đã bị hủy trước đó');
    }
    if (
      requirePendingRequest &&
      order.cancelRequestStatus !== CancelRequestStatus.PENDING
    ) {
      throw new BadRequestException('Không có yêu cầu hủy đang chờ');
    }

    const quantities = new Map<number, number>();
    for (const item of order.items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) || 0) + item.quantity,
      );
    }

    const productIds = [...quantities.keys()];
    const products = await manager
      .getRepository(Product)
      .createQueryBuilder('product')
      .where('product.id IN (:...productIds)', { productIds })
      .setLock('pessimistic_write')
      .getMany();

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'Không thể hoàn kho vì có sản phẩm không còn tồn tại',
      );
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelRequestStatus =
      requirePendingRequest ||
      order.cancelRequestStatus === CancelRequestStatus.PENDING
        ? CancelRequestStatus.APPROVED
        : CancelRequestStatus.NONE;
    order.cancelReason = directReason || order.cancelReason;
    order.cancelApprovedBy = adminId;
    order.cancelReviewedBy = adminId;
    order.cancelReviewedAt = new Date();
    order.cancelRejectionReason = null;
    order.cancelledAt = new Date();
    await manager.save(order);

    for (const product of products) {
      const quantity = quantities.get(product.id)!;
      const stockBefore = product.stock;
      product.stock += quantity;
      await manager.save(product);
      await this.inventoryService.recordMovement(manager, {
        productId: product.id,
        type: InventoryTransactionType.ORDER_CANCEL,
        quantity,
        stockBefore,
        stockAfter: product.stock,
        createdBy: adminId,
        referenceId: order.id,
        note: `Hoàn kho do hủy hóa đơn #${order.id}: ${order.cancelReason}`,
      });
    }

    await this.refreshClosedShiftSnapshot(manager, order.shiftId);
  }

  private async refreshClosedShiftSnapshot(
    manager: EntityManager,
    shiftId: number | null,
  ) {
    if (!shiftId) return;

    const shift = await manager
      .getRepository(Shift)
      .createQueryBuilder('shift')
      .where('shift.id = :shiftId', { shiftId })
      .setLock('pessimistic_write')
      .getOne();
    if (!shift || shift.status !== ShiftStatus.CLOSED) return;

    const orders = await manager.getRepository(Order).find({
      where: { shiftId, status: OrderStatus.COMPLETED },
    });
    const totalRevenue = orders.reduce(
      (sum, current) => sum + Number(current.totalAmount),
      0,
    );
    const cashSales = orders
      .filter((current) => current.paymentMethod === PaymentMethod.CASH)
      .reduce((sum, current) => sum + Number(current.totalAmount), 0);

    shift.totalRevenue = totalRevenue;
    shift.totalOrders = orders.length;
    shift.cashSales = cashSales;
    shift.transferSales = totalRevenue - cashSales;
    shift.expectedCash = Number(shift.openingCash) + cashSales;
    shift.difference =
      shift.actualCash === null
        ? null
        : Number(shift.actualCash) - shift.expectedCash;
    await manager.save(shift);
  }

  async getRevenueReport(from: Date, toExclusive: Date) {
    const orders = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .where('order.createdAt >= :from AND order.createdAt < :toExclusive', {
        from,
        toExclusive,
      })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .orderBy('order.createdAt', 'ASC')
      .getMany();

    let totalRevenue = 0;
    let totalCost = 0;
    let totalItems = 0;
    const productSales: Record<
      number,
      {
        name: string;
        quantity: number;
        totalRevenue: number;
        totalProfit: number;
      }
    > = {};
    const dailySales: Record<
      string,
      { revenue: number; profit: number; orders: number }
    > = {};

    for (const order of orders) {
      totalRevenue += Number(order.totalAmount);
      const dateKey = this.formatDateKey(order.createdAt);
      dailySales[dateKey] ||= { revenue: 0, profit: 0, orders: 0 };
      dailySales[dateKey].orders += 1;
      dailySales[dateKey].revenue += Number(order.totalAmount);

      for (const item of order.items) {
        const itemRevenue = Number(item.priceAtTime) * item.quantity;
        const itemCost = Number(item.costAtTime) * item.quantity;
        const itemProfit = itemRevenue - itemCost;
        totalCost += itemCost;
        totalItems += item.quantity;
        dailySales[dateKey].profit += itemProfit;

        productSales[item.productId] ||= {
          name: item.product?.name || `Sản phẩm #${item.productId}`,
          quantity: 0,
          totalRevenue: 0,
          totalProfit: 0,
        };
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].totalRevenue += itemRevenue;
        productSales[item.productId].totalProfit += itemProfit;
      }
    }

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id: Number(id), ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const dailyRevenue = Object.entries(dailySales).map(([date, data]) => ({
      date,
      ...data,
    }));

    return {
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      totalOrders: orders.length,
      totalItems,
      topProducts,
      dailyRevenue,
    };
  }

  private formatDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
