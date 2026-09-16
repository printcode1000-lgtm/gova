import "server-only";

import { usersDataSource } from "../../../core";
import type { IDatabaseClient } from "../../../core/database/database-client.interface";
import type {
  VerificationChannel,
  VerificationPurpose,
  VerificationState,
} from "@asol/verification-core";

export interface VerificationChallengeEntity {
  id: string;
  purpose: VerificationPurpose;
  channel: VerificationChannel;
  state: VerificationState;
  uid: string | null;
  phoneE164: string;
  email: string | null;
  codeHash: string;
  proofNonceHash: string | null;
  requestIpHash: string;
  requesterDeviceHash: string | null;
  expiresAt: string;
  attempts: number;
  resendCount: number;
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
  consumedAt: string | null;
  cancelledAt: string | null;
  dispatchId: string | null;
  dispatchNonceHash: string | null;
  dispatchExpiresAt: string | null;
  dispatchRedeemedAt: string | null;
  dispatchStatus: string | null;
  dispatchFailureCode: string | null;
  lastAttemptAt: string | null;
}

export type NewVerificationChallengeEntity = Omit<
  VerificationChallengeEntity,
  | "proofNonceHash"
  | "verifiedAt"
  | "consumedAt"
  | "cancelledAt"
  | "dispatchRedeemedAt"
  | "dispatchFailureCode"
  | "lastAttemptAt"
> &
  Partial<
    Pick<
      VerificationChallengeEntity,
      | "proofNonceHash"
      | "verifiedAt"
      | "consumedAt"
      | "cancelledAt"
      | "dispatchRedeemedAt"
      | "dispatchFailureCode"
      | "lastAttemptAt"
    >
  >;

const SELECT = `
SELECT id, purpose, channel, state, uid, phone_e164 AS phoneE164, email,
code_hash AS codeHash, proof_nonce_hash AS proofNonceHash,
request_ip_hash AS requestIpHash, requester_device_hash AS requesterDeviceHash,
expires_at AS expiresAt, attempts, resend_count AS resendCount,
created_at AS createdAt, updated_at AS updatedAt, verified_at AS verifiedAt,
consumed_at AS consumedAt, cancelled_at AS cancelledAt, dispatch_id AS dispatchId,
dispatch_nonce_hash AS dispatchNonceHash, dispatch_expires_at AS dispatchExpiresAt,
dispatch_redeemed_at AS dispatchRedeemedAt, dispatch_status AS dispatchStatus,
dispatch_failure_code AS dispatchFailureCode, last_attempt_at AS lastAttemptAt
FROM verification_challenges`;

function rowToEntity(row: any): VerificationChallengeEntity {
  return {
    ...row,
    attempts: Number(row.attempts),
    resendCount: Number(row.resendCount),
  } as VerificationChallengeEntity;
}

export class VerificationChallengeRepository {
  constructor(private readonly database: IDatabaseClient = usersDataSource) {}

  async create(challenge: NewVerificationChallengeEntity): Promise<void> {
    await this.database.execute(
      `INSERT INTO verification_challenges (
        id, purpose, channel, state, uid, phone_e164, email, code_hash, proof_nonce_hash,
        request_ip_hash, requester_device_hash, expires_at, attempts, resend_count,
        created_at, updated_at, verified_at, consumed_at, cancelled_at,
        dispatch_id, dispatch_nonce_hash, dispatch_expires_at, dispatch_redeemed_at,
        dispatch_status, dispatch_failure_code, last_attempt_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        challenge.id,
        challenge.purpose,
        challenge.channel,
        challenge.state,
        challenge.uid,
        challenge.phoneE164,
        challenge.email,
        challenge.codeHash,
        challenge.proofNonceHash ?? null,
        challenge.requestIpHash,
        challenge.requesterDeviceHash,
        challenge.expiresAt,
        challenge.attempts,
        challenge.resendCount,
        challenge.createdAt,
        challenge.updatedAt,
        challenge.verifiedAt ?? null,
        challenge.consumedAt ?? null,
        challenge.cancelledAt ?? null,
        challenge.dispatchId,
        challenge.dispatchNonceHash,
        challenge.dispatchExpiresAt,
        challenge.dispatchRedeemedAt ?? null,
        challenge.dispatchStatus,
        challenge.dispatchFailureCode ?? null,
        challenge.lastAttemptAt ?? null,
      ],
    );
  }

  async countRecentByPhonePurpose(phoneE164: string, purpose: VerificationPurpose, since: string): Promise<number> {
    return (
      await this.database.execute(
        "SELECT id FROM verification_challenges WHERE phone_e164 = ? AND purpose = ? AND created_at >= ?",
        [phoneE164, purpose, since],
      )
    ).length;
  }

  async countRecentByIp(requestIpHash: string, since: string): Promise<number> {
    return (
      await this.database.execute(
        "SELECT id FROM verification_challenges WHERE request_ip_hash = ? AND created_at >= ?",
        [requestIpHash, since],
      )
    ).length;
  }

  async findById(id: string): Promise<VerificationChallengeEntity | null> {
    const row = (await this.database.execute(`${SELECT} WHERE id = ? LIMIT 1`, [id]))[0] as any;
    return row ? rowToEntity(row) : null;
  }

  async findByDispatchId(dispatchId: string): Promise<VerificationChallengeEntity | null> {
    const row = (await this.database.execute(`${SELECT} WHERE dispatch_id = ? LIMIT 1`, [dispatchId]))[0] as any;
    return row ? rowToEntity(row) : null;
  }

  async recordFailedAttempt(id: string, attempts: number, now: string): Promise<void> {
    await this.database.execute(
      "UPDATE verification_challenges SET attempts = ?, last_attempt_at = ?, updated_at = ? WHERE id = ?",
      [attempts, now, now, id],
    );
  }

  /** Single-use claim: `RETURNING id` proves this call, not a racing one, won the row. */
  async markVerified(id: string, proofNonceHash: string, now: string): Promise<boolean> {
    const rows = await this.database.execute(
      "UPDATE verification_challenges SET state = 'verified', verified_at = ?, proof_nonce_hash = ?, updated_at = ? WHERE id = ? AND verified_at IS NULL AND consumed_at IS NULL AND cancelled_at IS NULL RETURNING id",
      [now, proofNonceHash, now, id],
    );
    return rows.length === 1;
  }

  async markConsumed(id: string, now: string): Promise<boolean> {
    const rows = await this.database.execute(
      "UPDATE verification_challenges SET state = 'consumed', consumed_at = ?, updated_at = ? WHERE id = ? AND verified_at IS NOT NULL AND consumed_at IS NULL AND cancelled_at IS NULL RETURNING id",
      [now, now, id],
    );
    return rows.length === 1;
  }

  async markDispatchRedeemed(id: string, codeHash: string, now: string): Promise<boolean> {
    const rows = await this.database.execute(
      "UPDATE verification_challenges SET state = 'code_sent', code_hash = ?, dispatch_redeemed_at = ?, dispatch_status = 'redeemed', updated_at = ? WHERE id = ? AND dispatch_redeemed_at IS NULL RETURNING id",
      [codeHash, now, now, id],
    );
    return rows.length === 1;
  }

  /**
   * Resend keeps challenge lineage: same row, rotated code/dispatch identity and
   * expiry. The previous code and dispatch ticket stop being redeemable.
   */
  async rotateForResend(input: {
    id: string;
    codeHash: string;
    state: VerificationState;
    expiresAt: string;
    dispatchId: string | null;
    dispatchNonceHash: string | null;
    dispatchExpiresAt: string | null;
    dispatchStatus: string | null;
    now: string;
  }): Promise<boolean> {
    const rows = await this.database.execute(
      `UPDATE verification_challenges SET
        state = ?, code_hash = ?, expires_at = ?, attempts = 0,
        resend_count = resend_count + 1, dispatch_id = ?, dispatch_nonce_hash = ?,
        dispatch_expires_at = ?, dispatch_redeemed_at = NULL, dispatch_status = ?,
        dispatch_failure_code = NULL, updated_at = ?
      WHERE id = ? AND verified_at IS NULL AND consumed_at IS NULL AND cancelled_at IS NULL
      RETURNING id`,
      [
        input.state,
        input.codeHash,
        input.expiresAt,
        input.dispatchId,
        input.dispatchNonceHash,
        input.dispatchExpiresAt,
        input.dispatchStatus,
        input.now,
        input.id,
      ],
    );
    return rows.length === 1;
  }

  async recordDispatchStatus(id: string, status: string, failureCode: string | null, now: string): Promise<void> {
    await this.database.execute(
      "UPDATE verification_challenges SET dispatch_status = ?, dispatch_failure_code = ?, updated_at = ? WHERE id = ?",
      [status, failureCode, now, id],
    );
  }
}
