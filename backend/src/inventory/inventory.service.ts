import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { AddStockDto } from './dto/add-stock.dto';
import { InventoryHistoryQueryDto } from './dto/inventory-history-query.dto';
import {
  InventoryTransaction,
  InventoryTransactionType,
} from './entities/inventory-transaction.entity';

export interface CreateInventoryTransaction {
  productId: number;
  type: InventoryTransactionType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  createdBy: number;
  referenceId?: number | null;
  note?: string | null;
}

@Injectable()
export class InventoryService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(InventoryTransaction)
    private transactionRepo: Repository<InventoryTransaction>,
  ) {}

  async addStock(productId: number, dto: AddStockDto, userId: number) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.getRepository(Product).findOne({
        where: { id: productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

      const stockBefore = product.stock;
      product.stock += dto.quantity;
      await manager.save(product);

      await this.recordMovement(manager, {
        productId,
        type: InventoryTransactionType.STOCK_IN,
        quantity: dto.quantity,
        stockBefore,
        stockAfter: product.stock,
        createdBy: userId,
        note: dto.note?.trim() || 'Nhập kho',
      });

      return product;
    });
  }

  recordMovement(manager: EntityManager, data: CreateInventoryTransaction) {
    const movement = manager.create(InventoryTransaction, {
      ...data,
      referenceId: data.referenceId ?? null,
      note: data.note ?? null,
    });
    return manager.save(movement);
  }

  async findHistory(query: InventoryHistoryQueryDto) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'Ngày bắt đầu không được sau ngày kết thúc',
      );
    }

    const qb = this.transactionRepo
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.product', 'product')
      .leftJoinAndSelect('movement.user', 'user')
      .orderBy('movement.createdAt', 'DESC')
      .addOrderBy('movement.id', 'DESC')
      .take(query.limit || 200);

    if (query.productId) {
      qb.andWhere('movement.productId = :productId', {
        productId: query.productId,
      });
    }
    if (query.type) {
      qb.andWhere('movement.type = :type', { type: query.type });
    }
    if (query.from) {
      qb.andWhere('movement.createdAt >= :from', {
        from: `${query.from}T00:00:00`,
      });
    }
    if (query.to) {
      const toExclusive = new Date(`${query.to}T00:00:00`);
      toExclusive.setDate(toExclusive.getDate() + 1);
      qb.andWhere('movement.createdAt < :toExclusive', { toExclusive });
    }

    return qb.getMany();
  }
}
