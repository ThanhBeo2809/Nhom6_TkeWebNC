import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

export enum InventoryTransactionType {
  STOCK_IN = 'stock_in',
  SALE = 'sale',
  ORDER_CANCEL = 'order_cancel',
}

@Entity('inventory_transactions')
@Index('IDX_inventory_created_at', ['createdAt'])
@Index('IDX_inventory_type_created_at', ['type', 'createdAt'])
@Index('IDX_inventory_reference_id', ['referenceId'])
export class InventoryTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productId: number;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ type: 'enum', enum: InventoryTransactionType })
  type: InventoryTransactionType;

  @Column()
  quantity: number;

  @Column()
  stockBefore: number;

  @Column()
  stockAfter: number;

  @Column({ type: 'int', nullable: true })
  referenceId: number | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  note: string | null;

  @Column()
  createdBy: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdBy' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
