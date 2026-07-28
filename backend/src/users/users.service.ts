import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

const DEFAULT_STAFF_PASSWORD = '12345678';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async findAll() {
    return this.userRepo.find({
      where: { role: UserRole.STAFF },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        mustChangePassword: true,
      },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email đã tồn tại');
    const temporaryPassword = DEFAULT_STAFF_PASSWORD;
    const defaultPassword = await bcrypt.hash(temporaryPassword, 10);
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: defaultPassword,
      role: UserRole.STAFF,
      mustChangePassword: true,
    });
    const saved = await this.userRepo.save(user);
    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      temporaryPassword,
    };
  }

  async toggleActive(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Nhân viên không tồn tại');
    user.isActive = !user.isActive;
    await this.userRepo.save(user);
    return { id: user.id, isActive: user.isActive };
  }
}
