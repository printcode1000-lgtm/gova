import type { User } from '../entities/user.entity';

export interface IUserRepository {
  create(user: Omit<User, 'id'>): Promise<void>;
  getByPhone(phone: string): Promise<User | null>;
  getByUid(uid: string): Promise<User | null>;
  update(uid: string, fields: Partial<User>): Promise<void>;
}
