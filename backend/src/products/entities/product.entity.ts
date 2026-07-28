import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 12, scale: 0 })
  price: number;

  @Column({ type: 'decimal', precision: 12, scale: 0, default: 0 })
  costPrice: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ nullable: true })
  image: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  categoryId: number;

  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
