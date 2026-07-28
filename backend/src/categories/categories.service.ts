import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
  ) {}

  findAll() {
    return this.categoryRepo.find();
  }

  async create(dto: CreateCategoryDto) {
    const existing = await this.categoryRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Danh mục đã tồn tại');
    const cat = this.categoryRepo.create(dto);
    return this.categoryRepo.save(cat);
  }
}
