import "server-only";

import { VerificationOperations } from "@asol/data-core/verification";
import type { VerificationChannel, VerificationPurpose } from "@asol/verification-core";
import {
  assertProofBinding,
  verifyVerificationProof,
} from "@asol/verification-core/server";
import { getVerificationConfig } from "@/core/config/server-env";

export class VerificationProofConsumer {
  constructor(private readonly operations = new VerificationOperations()) {}

  private secret(): string {
    return getVerificationConfig().signingSecret;
  }

  async consume(proof: string, expected: {
    purpose: VerificationPurpose;
    phone: string;
    uid?: string | null;
    email?: string | null;
    channel?: VerificationChannel;
  }): Promise<void> {
    const claims = verifyVerificationProof(proof, { secret: () => this.secret() });
    assertProofBinding(claims, expected);
    const challenge = await this.operations.findById(claims.challengeId);
    if (!challenge?.verifiedAt || challenge.consumedAt || challenge.cancelledAt) {
      throw new Error("verificationProofInvalid");
    }
    // The conditional claim is the single-use guarantee: whoever loses the race
    // gets `false` here and must not be treated as authorized.
    const consumed = await this.operations.markConsumed(challenge.id, new Date().toISOString());
    if (!consumed) throw new Error("verificationProofInvalid");
  }
}

export const verificationProofConsumer = new VerificationProofConsumer();
