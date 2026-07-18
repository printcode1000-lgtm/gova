import 'server-only';

import { and, desc, eq, gte, isNull } from 'drizzle-orm';
import { dbClient } from '@/core/database/db-client';
import type { IDatabaseClient } from '@/core/database/database-client.interface';
import {
  passwordRecoveryChallenges,
  type NewPasswordRecoveryChallengeEntity,
  type PasswordRecoveryChallengeEntity,
} from '@/core/database/schema';

export class PasswordRecoveryRepository {
  constructor(private readonly database: IDatabaseClient = dbClient) {}

  async create(challenge: NewPasswordRecoveryChallengeEntity): Promise<void> {
    await this.database.db.insert(passwordRecoveryChallenges).values(challenge);
  }

  async countRecentByPhone(phoneHash: string, since: string): Promise<number> {
    const rows = await this.database.db
      .select({ id: passwordRecoveryChallenges.id })
      .from(passwordRecoveryChallenges)
      .where(and(
        eq(passwordRecoveryChallenges.phoneHash, phoneHash),
        gte(passwordRecoveryChallenges.createdAt, since),
      ));
    return rows.length;
  }

  async countRecentByIp(requestIpHash: string, since: string): Promise<number> {
    const rows = await this.database.db
      .select({ id: passwordRecoveryChallenges.id })
      .from(passwordRecoveryChallenges)
      .where(and(
        eq(passwordRecoveryChallenges.requestIpHash, requestIpHash),
        gte(passwordRecoveryChallenges.createdAt, since),
      ));
    return rows.length;
  }

  async findLatestActive(
    phoneHash: string,
    now: string,
  ): Promise<PasswordRecoveryChallengeEntity | null> {
    const rows = await this.database.db
      .select()
      .from(passwordRecoveryChallenges)
      .where(and(
        eq(passwordRecoveryChallenges.phoneHash, phoneHash),
        gte(passwordRecoveryChallenges.expiresAt, now),
        isNull(passwordRecoveryChallenges.consumedAt),
      ))
      .orderBy(desc(passwordRecoveryChallenges.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async recordFailedAttempt(id: string, attempts: number, now: string): Promise<void> {
    await this.database.db
      .update(passwordRecoveryChallenges)
      .set({ attempts, lastAttemptAt: now })
      .where(eq(passwordRecoveryChallenges.id, id));
  }

  async markVerified(id: string, resetTokenHash: string, now: string): Promise<void> {
    await this.database.db
      .update(passwordRecoveryChallenges)
      .set({ verifiedAt: now, resetTokenHash, lastAttemptAt: now })
      .where(eq(passwordRecoveryChallenges.id, id));
  }

  async findVerifiedByToken(
    phoneHash: string,
    resetTokenHash: string,
    now: string,
  ): Promise<PasswordRecoveryChallengeEntity | null> {
    const rows = await this.database.db
      .select()
      .from(passwordRecoveryChallenges)
      .where(and(
        eq(passwordRecoveryChallenges.phoneHash, phoneHash),
        eq(passwordRecoveryChallenges.resetTokenHash, resetTokenHash),
        gte(passwordRecoveryChallenges.expiresAt, now),
        isNull(passwordRecoveryChallenges.consumedAt),
      ))
      .limit(1);
    return rows[0] ?? null;
  }

  async markConsumed(id: string, now: string): Promise<void> {
    await this.database.db
      .update(passwordRecoveryChallenges)
      .set({ consumedAt: now })
      .where(eq(passwordRecoveryChallenges.id, id));
  }
}
