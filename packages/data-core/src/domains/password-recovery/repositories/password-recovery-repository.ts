import { usersDataSource } from "../../../core";
import 'server-only';
import type { IDatabaseClient } from '../../../core/database/database-client.interface';

export interface PasswordRecoveryChallengeEntity {
  id: string; phoneHash: string; uid: string | null; codeHash: string; resetTokenHash: string | null;
  requestIpHash: string; expiresAt: string; verifiedAt: string | null; consumedAt: string | null;
  attempts: number; createdAt: string; lastAttemptAt: string | null;
}
export type NewPasswordRecoveryChallengeEntity = Omit<PasswordRecoveryChallengeEntity, "resetTokenHash" | "verifiedAt" | "consumedAt" | "lastAttemptAt"> & Partial<Pick<PasswordRecoveryChallengeEntity, "resetTokenHash" | "verifiedAt" | "consumedAt" | "lastAttemptAt">>;
const SELECT = `SELECT id, phone_hash AS phoneHash, uid, code_hash AS codeHash, reset_token_hash AS resetTokenHash, request_ip_hash AS requestIpHash, expires_at AS expiresAt, verified_at AS verifiedAt, consumed_at AS consumedAt, attempts, created_at AS createdAt, last_attempt_at AS lastAttemptAt FROM password_recovery_challenges`;
export class PasswordRecoveryRepository {
  constructor(private readonly database: IDatabaseClient = usersDataSource) {}
  async create(c: NewPasswordRecoveryChallengeEntity): Promise<void> { await this.database.execute(`INSERT INTO password_recovery_challenges (id, phone_hash, uid, code_hash, reset_token_hash, request_ip_hash, expires_at, verified_at, consumed_at, attempts, created_at, last_attempt_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [c.id,c.phoneHash,c.uid,c.codeHash,c.resetTokenHash ?? null,c.requestIpHash,c.expiresAt,c.verifiedAt ?? null,c.consumedAt ?? null,c.attempts,c.createdAt,c.lastAttemptAt ?? null]); }
  async countRecentByPhone(phoneHash:string,since:string):Promise<number>{ return (await this.database.execute('SELECT id FROM password_recovery_challenges WHERE phone_hash = ? AND created_at >= ?',[phoneHash,since])).length; }
  async countRecentByIp(requestIpHash:string,since:string):Promise<number>{ return (await this.database.execute('SELECT id FROM password_recovery_challenges WHERE request_ip_hash = ? AND created_at >= ?',[requestIpHash,since])).length; }
  async findLatestActive(phoneHash:string,now:string):Promise<PasswordRecoveryChallengeEntity|null>{ const r=await this.database.execute(`${SELECT} WHERE phone_hash = ? AND expires_at >= ? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1`,[phoneHash,now]); return (r[0] as any)??null; }
  async recordFailedAttempt(id:string,attempts:number,now:string):Promise<void>{ await this.database.execute('UPDATE password_recovery_challenges SET attempts = ?, last_attempt_at = ? WHERE id = ?',[attempts,now,id]); }
  async markVerified(id:string,resetTokenHash:string,now:string):Promise<void>{ await this.database.execute('UPDATE password_recovery_challenges SET verified_at = ?, reset_token_hash = ?, last_attempt_at = ? WHERE id = ?',[now,resetTokenHash,now,id]); }
  async findVerifiedByToken(phoneHash:string,resetTokenHash:string,now:string):Promise<PasswordRecoveryChallengeEntity|null>{ const r=await this.database.execute(`${SELECT} WHERE phone_hash = ? AND reset_token_hash = ? AND expires_at >= ? AND consumed_at IS NULL LIMIT 1`,[phoneHash,resetTokenHash,now]); return (r[0] as any)??null; }
  async markConsumed(id:string,now:string):Promise<void>{ await this.database.execute('UPDATE password_recovery_challenges SET consumed_at = ? WHERE id = ?',[now,id]); }
}
