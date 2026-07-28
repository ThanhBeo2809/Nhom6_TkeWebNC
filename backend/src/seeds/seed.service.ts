import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

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
}
