import { eq, and, isNull } from 'drizzle-orm';
import { dbClient } from '@/core/database/db-client';
import type { IDatabaseClient } from '@/core/database/database-client.interface';
import { users } from '@/core/database/schema';
import type { User } from '../entities/user.entity';
import type { IUserRepository } from './user-repository.interface';

export class UserRepository implements IUserRepository {
  constructor(private database: IDatabaseClient = dbClient) {}

  async create(user: Omit<User, 'id'>): Promise<void> {
    await this.database.db.insert(users).values({
      uid: user.uid,
      phone: user.phone,
      email: user.email || null,
      password: user.password || '',
      lastLoginAt: user.last_login_at || null,
      createdAt: user.created_at || new Date().toISOString(),
      updatedAt: user.updated_at || new Date().toISOString(),
      deletedAt: user.deleted_at || null,
    });
  }

  async getByPhone(phone: string): Promise<User | null> {
    const rows = await this.database.db
      .select()
      .from(users)
      .where(and(
        eq(users.phone, phone),
        isNull(users.deletedAt)
      ))
      .limit(1);
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.id,
      uid: row.uid,
      phone: row.phone,
      email: row.email,
      password: row.password,
      last_login_at: row.lastLoginAt,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      deleted_at: row.deletedAt,
    };
  }

  async getByUid(uid: string): Promise<User | null> {
    const rows = await this.database.db
      .select()
      .from(users)
      .where(and(
        eq(users.uid, uid),
        isNull(users.deletedAt)
      ))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      uid: row.uid,
      phone: row.phone,
      email: row.email,
      password: row.password,
      last_login_at: row.lastLoginAt,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
      deleted_at: row.deletedAt,
    };
  }

  async update(uid: string, fields: Partial<User>): Promise<void> {
    const updateData: any = {};
    
    if (fields.phone !== undefined) updateData.phone = fields.phone;
    if (fields.email !== undefined) updateData.email = fields.email;
    if (fields.password !== undefined) updateData.password = fields.password;
    if (fields.last_login_at !== undefined) updateData.lastLoginAt = fields.last_login_at;
    if (fields.deleted_at !== undefined) updateData.deletedAt = fields.deleted_at;

    updateData.updatedAt = new Date().toISOString();

    await this.database.db
      .update(users)
      .set(updateData)
      .where(eq(users.uid, uid));
  }
}

// Export singleton repository
export const userRepository = new UserRepository();
