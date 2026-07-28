import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  findAll(activeOnly = false) {
    if (activeOnly) return this.productRepo.find({ where: { isActive: true } });
    return this.productRepo.find();
  }

  async findOne(id: number) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    return product;
  }

  async create(dto: CreateProductDto) {
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async update(id: number, dto: UpdateProductDto) {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async toggleActive(id: number) {
    const product = await this.findOne(id);
    product.isActive = !product.isActive;
    await this.productRepo.save(product);
    return { id: product.id, isActive: product.isActive };
  }

  async updateStock(id: number, quantity: number) {
    const product = await this.findOne(id);
    product.stock += quantity;
    return this.productRepo.save(product);
  }

  async decreaseStock(id: number, quantity: number) {
    const product = await this.findOne(id);
    product.stock -= quantity;
    return this.productRepo.save(product);
  }

  getLowStock(threshold = 10) {
    return this.productRepo
      .createQueryBuilder('p')
      .where('p.stock < :threshold AND p.isActive = true', { threshold })
      .getMany();
  }
}
