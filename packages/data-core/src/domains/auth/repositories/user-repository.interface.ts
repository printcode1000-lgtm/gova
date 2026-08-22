import type { User } from '../entities';

export interface IUserRepository {
  create(user: Omit<User, 'id'>): Promise<void>;
  getByPhone(phone: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  getByUid(uid: string): Promise<User | null>;
  update(uid: string, fields: Partial<User>): Promise<void>;
}
