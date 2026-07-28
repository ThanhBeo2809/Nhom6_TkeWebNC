import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import {
  CancelRequestStatus,
  Order,
  OrderStatus,
  PaymentMethod,
} from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import {
  InventoryTransaction,
  InventoryTransactionType,
} from '../inventory/entities/inventory-transaction.entity';
import { Shift, ShiftStatus } from '../shifts/entities/shift.entity';
import { DEMO_PRODUCTS, DEMO_STAFF } from './demo-data';

const DEMO_NOTE_PREFIX = '[DỮ LIỆU MẪU]';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    const count = await this.userRepo.count();
    if (count === 0) {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@cuahang.com';
      const initialPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hashed = await bcrypt.hash(initialPassword, 10);
      await this.userRepo.save({
        name: process.env.ADMIN_NAME || 'Quản trị viên',
        email: adminEmail,
        password: hashed,
        role: UserRole.ADMIN,
        isActive: true,
        mustChangePassword: true,
      });
      console.log(`Đã tạo tài khoản Admin ban đầu: ${adminEmail}`);
    }
  }

  async seedDemoData() {
    return this.dataSource.transaction(async (manager) => {
      const admin = await manager.getRepository(User).findOne({
        where: { role: UserRole.ADMIN },
        order: { id: 'ASC' },
      });
      if (!admin) {
        throw new Error('Cần có ít nhất một tài khoản Admin trước khi seed');
      }

      const created = {
        staff: 0,
        categories: 0,
        products: 0,
        shifts: 0,
        orders: 0,
        orderItems: 0,
        inventoryTransactions: 0,
      };

      const staff = await this.ensureStaff(manager, created);
      const products = await this.ensureCatalog(manager, admin.id, created);
      const existingDemoOrders = await manager
        .getRepository(Order)
        .createQueryBuilder('order')
        .where('order.note LIKE :prefix', {
          prefix: `${DEMO_NOTE_PREFIX}%`,
        })
        .getCount();

      if (existingDemoOrders > 0) {
        return {
          message:
            'Dữ liệu mẫu đã tồn tại; chỉ bổ sung các danh mục, sản phẩm hoặc nhân viên còn thiếu.',
          counts: created,
        };
      }

      await this.createSalesHistory(
        manager,
        admin.id,
        staff,
        products,
        created,
      );

      return {
        message: 'Đã thêm bộ dữ liệu mẫu vào cơ sở dữ liệu thành công.',
        counts: created,
      };
    });
  }

  private async ensureStaff(
    manager: EntityManager,
    created: Record<string, number>,
  ) {
    const repository = manager.getRepository(User);
    const password = await bcrypt.hash(
      process.env.DEMO_STAFF_PASSWORD || 'NhanVien@123',
      10,
    );
    const staff: User[] = [];

    for (const data of DEMO_STAFF) {
      let user = await repository.findOne({ where: { email: data.email } });
      if (!user) {
        user = await repository.save(
          repository.create({
            ...data,
            password,
            role: UserRole.STAFF,
            isActive: true,
            mustChangePassword: true,
          }),
        );
        created.staff += 1;
      }
      staff.push(user);
    }

    return staff;
  }

  private async ensureCatalog(
    manager: EntityManager,
    adminId: number,
    created: Record<string, number>,
  ) {
    const categoryRepository = manager.getRepository(Category);
    const productRepository = manager.getRepository(Product);
    const categoryByName = new Map<string, Category>();

    for (const name of [
      ...new Set(DEMO_PRODUCTS.map((item) => item.category)),
    ]) {
      let category = await categoryRepository.findOne({ where: { name } });
      if (!category) {
        category = await categoryRepository.save(
          categoryRepository.create({ name }),
        );
        created.categories += 1;
      }
      categoryByName.set(name, category);
    }

    const products: Product[] = [];
    const stockDate = new Date();
    stockDate.setDate(stockDate.getDate() - 46);

    for (const data of DEMO_PRODUCTS) {
      let product = await productRepository.findOne({
        where: { name: data.name },
      });
      if (!product) {
        product = await productRepository.save(
          productRepository.create({
            name: data.name,
            categoryId: categoryByName.get(data.category)!.id,
            price: data.price,
            costPrice: data.costPrice,
            stock: data.stock,
            isActive: true,
          }),
        );
        await manager.getRepository(InventoryTransaction).save({
          productId: product.id,
          type: InventoryTransactionType.STOCK_IN,
          quantity: data.stock,
          stockBefore: 0,
          stockAfter: data.stock,
          referenceId: null,
          note: `${DEMO_NOTE_PREFIX} Nhập kho ban đầu`,
          createdBy: adminId,
          createdAt: stockDate,
        });
        created.products += 1;
        created.inventoryTransactions += 1;
      }
      products.push(product);
    }

    return products;
  }

  private async createSalesHistory(
    manager: EntityManager,
    adminId: number,
    staff: User[],
    products: Product[],
    created: Record<string, number>,
  ) {
    const shiftRepository = manager.getRepository(Shift);
    const orderRepository = manager.getRepository(Order);
    const itemRepository = manager.getRepository(OrderItem);
    const movementRepository = manager.getRepository(InventoryTransaction);
    const currentStock = new Map(
      products.map((product) => [product.id, product.stock]),
    );
    let sequence = 0;

    for (let daysAgo = 44; daysAgo >= 0; daysAgo -= 1) {
      for (let slot = 0; slot < 2; slot += 1) {
        const staffMember = staff[(daysAgo * 2 + slot) % staff.length];
        const startedAt = this.dateAtDaysAgo(daysAgo, slot === 0 ? 7 : 14, 30);
        const endedAt = this.dateAtDaysAgo(daysAgo, slot === 0 ? 13 : 21, 30);
        const openingCash = 500000 + ((daysAgo + slot) % 4) * 100000;
        const shift = await shiftRepository.save(
          shiftRepository.create({
            staffId: staffMember.id,
            openingCash,
            status: ShiftStatus.CLOSED,
            startedAt,
            endedAt,
            actualCash: 0,
            expectedCash: 0,
            difference: 0,
            totalRevenue: 0,
            cashSales: 0,
            transferSales: 0,
            totalOrders: 0,
            closedBy: null,
            closeNote: `${DEMO_NOTE_PREFIX} Ca làm lịch sử`,
          }),
        );
        created.shifts += 1;

        let totalRevenue = 0;
        let cashSales = 0;
        let totalOrders = 0;
        const ordersInShift = 3 + ((daysAgo + slot) % 3);

        for (let orderIndex = 0; orderIndex < ordersInShift; orderIndex += 1) {
          sequence += 1;
          const itemCount = 2 + (sequence % 3);
          const selections = Array.from({ length: itemCount }, (_, index) => ({
            product: products[(sequence * 7 + index * 11) % products.length],
            quantity: 1 + ((sequence + index) % 3),
          }));
          const totalAmount = selections.reduce(
            (sum, item) => sum + Number(item.product.price) * item.quantity,
            0,
          );
          const isCancelled = sequence % 31 === 0;
          const isPending = !isCancelled && sequence % 37 === 0;
          const isRejected = !isCancelled && !isPending && sequence % 41 === 0;
          const paymentMethod =
            sequence % 3 === 0 ? PaymentMethod.TRANSFER : PaymentMethod.CASH;
          const createdAt = new Date(
            startedAt.getTime() +
              (orderIndex + 1) *
                ((endedAt.getTime() - startedAt.getTime()) /
                  (ordersInShift + 1)),
          );
          const amountPaid =
            paymentMethod === PaymentMethod.TRANSFER
              ? totalAmount
              : Math.ceil(totalAmount / 50000) * 50000;
          const order = await orderRepository.save(
            orderRepository.create({
              totalAmount,
              status: isCancelled
                ? OrderStatus.CANCELLED
                : OrderStatus.COMPLETED,
              paymentMethod,
              amountPaid,
              changeAmount: Math.max(amountPaid - totalAmount, 0),
              note: `${DEMO_NOTE_PREFIX} Đơn hàng #${sequence}`,
              cancelRequestStatus: isCancelled
                ? CancelRequestStatus.APPROVED
                : isPending
                  ? CancelRequestStatus.PENDING
                  : isRejected
                    ? CancelRequestStatus.REJECTED
                    : CancelRequestStatus.NONE,
              cancelReason:
                isCancelled || isPending || isRejected
                  ? 'Khách thay đổi nhu cầu mua hàng'
                  : null,
              cancelRequestedBy:
                isCancelled || isPending || isRejected ? staffMember.id : null,
              cancelRequestedAt:
                isCancelled || isPending || isRejected
                  ? new Date(createdAt.getTime() + 5 * 60 * 1000)
                  : null,
              cancelApprovedBy: isCancelled ? adminId : null,
              cancelReviewedBy: isCancelled || isRejected ? adminId : null,
              cancelReviewedAt:
                isCancelled || isRejected
                  ? new Date(createdAt.getTime() + 15 * 60 * 1000)
                  : null,
              cancelRejectionReason: isRejected
                ? 'Hóa đơn đã được đối soát và giao cho khách'
                : null,
              cancelledAt: isCancelled
                ? new Date(createdAt.getTime() + 15 * 60 * 1000)
                : null,
              createdBy: staffMember.id,
              shiftId: shift.id,
              createdAt,
            }),
          );
          created.orders += 1;

          for (const selection of selections) {
            await itemRepository.save(
              itemRepository.create({
                orderId: order.id,
                productId: selection.product.id,
                quantity: selection.quantity,
                priceAtTime: selection.product.price,
                costAtTime: selection.product.costPrice,
              }),
            );
            created.orderItems += 1;

            const stockBefore = currentStock.get(selection.product.id)!;
            const stockAfter = stockBefore - selection.quantity;
            currentStock.set(selection.product.id, stockAfter);
            await movementRepository.save(
              movementRepository.create({
                productId: selection.product.id,
                type: InventoryTransactionType.SALE,
                quantity: selection.quantity,
                stockBefore,
                stockAfter,
                referenceId: order.id,
                note: `${DEMO_NOTE_PREFIX} Bán hàng - hóa đơn #${order.id}`,
                createdBy: staffMember.id,
                createdAt,
              }),
            );
            created.inventoryTransactions += 1;

            if (isCancelled) {
              currentStock.set(selection.product.id, stockBefore);
              await movementRepository.save(
                movementRepository.create({
                  productId: selection.product.id,
                  type: InventoryTransactionType.ORDER_CANCEL,
                  quantity: selection.quantity,
                  stockBefore: stockAfter,
                  stockAfter: stockBefore,
                  referenceId: order.id,
                  note: `${DEMO_NOTE_PREFIX} Hoàn kho hóa đơn #${order.id}`,
                  createdBy: adminId,
                  createdAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
                }),
              );
              created.inventoryTransactions += 1;
            }
          }

          if (!isCancelled) {
            totalRevenue += totalAmount;
            totalOrders += 1;
            if (paymentMethod === PaymentMethod.CASH) {
              cashSales += totalAmount;
            }
          }
        }

        const expectedCash = openingCash + cashSales;
        const difference = (((daysAgo + slot) % 5) - 2) * 2000;
        shift.totalRevenue = totalRevenue;
        shift.totalOrders = totalOrders;
        shift.cashSales = cashSales;
        shift.transferSales = totalRevenue - cashSales;
        shift.expectedCash = expectedCash;
        shift.actualCash = expectedCash + difference;
        shift.difference = difference;
        await shiftRepository.save(shift);
      }
    }

    for (const product of products) {
      product.stock = currentStock.get(product.id)!;
    }
    await manager.getRepository(Product).save(products);
  }

  private dateAtDaysAgo(daysAgo: number, hour: number, minute: number) {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    date.setDate(date.getDate() - daysAgo);
    return date;
  }
}
