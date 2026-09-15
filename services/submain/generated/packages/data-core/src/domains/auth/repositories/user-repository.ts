import { usersDataSource } from "../../../core";
import 'server-only';

import type { IDatabaseClient } from '../../../core/database/database-client.interface';
import type { User } from '../entities';
import type { IUserRepository } from './user-repository.interface';
import { authPhoneCandidates, normalizeAuthPhone, normalizeAuthEmail } from '@asol/auth-core/server';

export class UserRepository implements IUserRepository {
  constructor(private database: IDatabaseClient = usersDataSource) {}

  async create(user: Omit<User, 'id'>): Promise<void> {
    await this.database.execute(
      `INSERT INTO users (uid, phone, email, password, provider_account_enabled, last_login_at, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.uid, normalizeAuthPhone(user.phone), normalizeAuthEmail(user.email), user.password || '', user.providerAccountEnabled ? 1 : 0, user.last_login_at || null, user.created_at || new Date().toISOString(), user.updated_at || new Date().toISOString(), user.deleted_at || null],
    );
  }

  private async find(where: string, params: unknown[]): Promise<User | null> {
    const rows = await this.database.execute(
      `SELECT id, uid, phone, email, password, provider_account_enabled AS providerAccountEnabled, last_login_at AS lastLoginAt, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt FROM users WHERE ${where} LIMIT 1`, params as any[],
    ) as any[];
    const row = rows[0];
    return row ? { id: Number(row.id), uid: String(row.uid), phone: String(row.phone), email: row.email == null ? null : String(row.email), password: String(row.password), providerAccountEnabled: Boolean(row.providerAccountEnabled), last_login_at: row.lastLoginAt ?? null, created_at: row.createdAt ?? null, updated_at: row.updatedAt ?? null, deleted_at: row.deletedAt ?? null } : null;
  }

  async getByPhone(phone: string): Promise<User | null> {
    const candidates = authPhoneCandidates(phone);
    if (!candidates.length) return null;
    return this.find(`phone IN (${candidates.map(() => '?').join(',')}) AND deleted_at IS NULL`, candidates);
  }
  async getByEmail(email: string): Promise<User | null> {
    const normalized = normalizeAuthEmail(email);
    return normalized ? this.find('email = ?', [normalized]) : null;
  }
  async getByUid(uid: string): Promise<User | null> { return this.find('uid = ? AND deleted_at IS NULL', [uid]); }

  async update(uid: string, fields: Partial<User>): Promise<void> {
    const updates: string[] = []; const params: unknown[] = [];
    const add=(column:string,value:unknown)=>{updates.push(`${column} = ?`);params.push(value)};
    if (fields.phone !== undefined) add('phone', normalizeAuthPhone(fields.phone));
    if (fields.email !== undefined) add('email', normalizeAuthEmail(fields.email));
    if (fields.password !== undefined) add('password', fields.password);
    if (fields.providerAccountEnabled !== undefined) add('provider_account_enabled', fields.providerAccountEnabled ? 1 : 0);
    if (fields.last_login_at !== undefined) add('last_login_at', fields.last_login_at);
    if (fields.deleted_at !== undefined) add('deleted_at', fields.deleted_at);
    add('updated_at', new Date().toISOString()); params.push(uid);
    await this.database.execute(`UPDATE users SET ${updates.join(', ')} WHERE uid = ?`, params as any[]);
  }
}

// Export singleton repository
export const userRepository = new UserRepository();
