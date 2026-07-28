import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy account status', () => {
  const config = { get: jest.fn().mockReturnValue('test-secret') };

  it('từ chối token của tài khoản đã bị khóa', async () => {
    const repository = {
      findOne: jest.fn().mockResolvedValue({ id: 2, isActive: false }),
    };
    const strategy = new JwtStrategy(config as any, repository as any);
    await expect(strategy.validate({ sub: 2 })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('trả dữ liệu mới nhất của tài khoản đang hoạt động', async () => {
    const user = {
      id: 2,
      email: 'staff@example.com',
      role: 'staff',
      name: 'Nhân viên',
      isActive: true,
      mustChangePassword: false,
    };
    const repository = { findOne: jest.fn().mockResolvedValue(user) };
    const strategy = new JwtStrategy(config as any, repository as any);
    await expect(strategy.validate({ sub: 2 })).resolves.toEqual({
      id: 2,
      email: user.email,
      role: user.role,
      name: user.name,
      mustChangePassword: false,
    });
  });
});
