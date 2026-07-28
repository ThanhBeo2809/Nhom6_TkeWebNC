import { Request } from 'express';
import { UserRole } from '../../users/entities/user.entity';

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
