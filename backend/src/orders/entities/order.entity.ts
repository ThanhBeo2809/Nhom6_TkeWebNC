import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH = 'cash',
  TRANSFER = 'transfer',
}
export enum CancelRequestStatus {
  NONE = 'none',
  PENDING = 'pending',
  REJECTED = 'rejected',
  APPROVED = 'approved',
}

@Entity('orders')
@Index('IDX_orders_created_at', ['createdAt'])
@Index('IDX_orders_status_created_at', ['status', 'createdAt'])
@Index('IDX_orders_created_by_created_at', ['createdBy', 'createdAt'])
@Index('IDX_orders_shift_id', ['shiftId'])
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'decimal', precision: 12, scale: 0 })
  totalAmount: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.COMPLETED })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  amountPaid: number;

  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  changeAmount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string | null;

  @Column({
    type: 'enum',
    enum: CancelRequestStatus,
    default: CancelRequestStatus.NONE,
  })
  cancelRequestStatus: CancelRequestStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancelReason: string | null;

  @Column({ type: 'int', nullable: true })
  cancelRequestedBy: number | null;

  @Column({ type: 'datetime', nullable: true })
  cancelRequestedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  cancelApprovedBy: number | null;

  @Column({ type: 'int', nullable: true })
  cancelReviewedBy: number | null;

  @Column({ type: 'datetime', nullable: true })
  cancelReviewedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancelRejectionReason: string | null;

  @Column({ type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Column()
  createdBy: number;

  @Column({ type: 'int', nullable: true })
  shiftId: number | null;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'createdBy' })
  user: User;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;
}
