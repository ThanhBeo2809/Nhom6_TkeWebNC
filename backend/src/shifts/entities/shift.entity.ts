import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
export enum ShiftStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}
@Entity('shifts')
@Index('IDX_shifts_started_at', ['startedAt'])
@Index('IDX_shifts_status_started_at', ['status', 'startedAt'])
@Index('IDX_shifts_staff_status', ['staffId', 'status'])
export class Shift {
  @PrimaryGeneratedColumn() id: number;
  @Column() staffId: number;
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'staffId' })
  staff: User;
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  openingCash: number;
  @Column({ type: 'decimal', precision: 12, scale: 0, nullable: true })
  actualCash: number | null;
  @Column({ type: 'decimal', precision: 12, scale: 0, nullable: true })
  expectedCash: number | null;
  @Column({ type: 'decimal', precision: 12, scale: 0, nullable: true })
  difference: number | null;
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  totalRevenue: number;
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  cashSales: number;
  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  transferSales: number;
  @Column({ default: 0 }) totalOrders: number;
  @Column({ type: 'enum', enum: ShiftStatus, default: ShiftStatus.OPEN })
  status: ShiftStatus;
  @CreateDateColumn() startedAt: Date;
  @Column({ type: 'datetime', nullable: true }) endedAt: Date | null;
  @Column({ type: 'int', nullable: true }) closedBy: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) closeNote:
    | string
    | null;
}
