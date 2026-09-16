import assert from "node:assert/strict";
import { VerificationChannels, VERIFICATION_RESEND_COOLDOWN_MS } from "@asol/verification-core";
import { VerificationService } from "../server/services/verification-service.server";
import type { VerificationChallengeEntity } from "@asol/data-core/verification";

/** In-memory stand-in for the cloud challenge store, claim semantics included. */
class FakeOperations {
  rows = new Map<string, VerificationChallengeEntity>();

  async createChallenge(challenge: any) {
    this.rows.set(challenge.id, { ...challenge } as VerificationChallengeEntity);
  }
  async countRecent() {
    return [0, 0] as [number, number];
  }
  async findById(id: string) {
    return this.rows.get(id) ?? null;
  }
  async findByDispatchId(dispatchId: string) {
    return [...this.rows.values()].find((row) => row.dispatchId === dispatchId) ?? null;
  }
  async recordFailedAttempt(id: string, attempts: number, now: string) {
    const row = this.rows.get(id)!;
    row.attempts = attempts;
    row.lastAttemptAt = now;
  }
  async markVerified(id: string, proofNonceHash: string, now: string) {
    const row = this.rows.get(id)!;
    if (row.verifiedAt || row.consumedAt || row.cancelledAt) return false;
    row.verifiedAt = now;
    row.proofNonceHash = proofNonceHash;
    row.state = "verified";
    row.updatedAt = now;
    return true;
  }
  async markConsumed(id: string, now: string) {
    const row = this.rows.get(id)!;
    if (!row.verifiedAt || row.consumedAt || row.cancelledAt) return false;
    row.consumedAt = now;
    row.state = "consumed";
    return true;
  }
  async markDispatchRedeemed(id: string, codeHash: string, now: string) {
    const row = this.rows.get(id)!;
    if (row.dispatchRedeemedAt) return false;
    row.dispatchRedeemedAt = now;
    row.codeHash = codeHash;
    row.dispatchStatus = "redeemed";
    row.state = "code_sent";
    return true;
  }
  async recordDispatchStatus(id: string, status: string, failureCode: string | null) {
    const row = this.rows.get(id)!;
    row.dispatchStatus = status;
    row.dispatchFailureCode = failureCode;
  }
  async rotateForResend(input: any) {
    const row = this.rows.get(input.id)!;
    if (row.verifiedAt || row.consumedAt || row.cancelledAt) return false;
    Object.assign(row, {
      state: input.state,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      attempts: 0,
      resendCount: row.resendCount + 1,
      dispatchId: input.dispatchId,
      dispatchNonceHash: input.dispatchNonceHash,
      dispatchExpiresAt: input.dispatchExpiresAt,
      dispatchRedeemedAt: null,
      dispatchStatus: input.dispatchStatus,
      dispatchFailureCode: null,
      updatedAt: input.now,
    });
    return true;
  }
}

class FakeDispatcher {
  sent: Array<{ challengeId: string; dispatchId: string; dispatchTicket: string }> = [];
  outcome: { delivered: true } | { delivered: false; failureCode: any } = { delivered: true };
  async dispatch(request: any) {
    this.sent.push(request);
    return this.outcome;
  }
}

class FakeMailer {
  sent: Array<{ email: string; code: string }> = [];
  async sendCode(input: { email: string; code: string }) {
    this.sent.push({ email: input.email, code: input.code });
  }
}

function build() {
  const operations = new FakeOperations();
  const mailer = new FakeMailer();
  const dispatcher = new FakeDispatcher();
  return {
    operations,
    mailer,
    dispatcher,
    service: new VerificationService(operations as any, mailer as any, undefined, dispatcher as any),
  };
}

const EGYPT = "+201026546550";
const INTERNATIONAL = "+966501234567";

async function main() {
  // --- international: mandatory email, zero SMS dispatch -----------------------
  {
    const { service, operations, mailer, dispatcher } = build();
    await assert.rejects(
      service.request({ purpose: "registration", phone: INTERNATIONAL, runtime: "web" }, "1.1.1.1"),
      /verificationEmailRequired/,
    );

    const requested = await service.request(
      { purpose: "registration", phone: INTERNATIONAL, email: "u@example.com", runtime: "android" },
      "1.1.1.1",
    );
    assert.equal(requested.channel, VerificationChannels.InternationalEmail);
    assert.equal(requested.dispatchId, undefined, "international requests must create no SMS dispatch");
    assert.equal(dispatcher.sent.length, 0, "international requests must issue no SMS dispatch");
    assert.equal(JSON.stringify(requested).includes(mailer.sent[0]!.code), false, "the OTP must never leave the server");

    const row = operations.rows.get(requested.challengeId)!;
    assert.equal(row.dispatchId, null);
    assert.equal(row.dispatchNonceHash, null);

    // wrong code, then the real one
    await assert.rejects(
      service.verify({
        challengeId: requested.challengeId,
        purpose: "registration",
        phone: INTERNATIONAL,
        email: "u@example.com",
        code: "000000",
      }),
      /verificationCodeInvalid/,
    );
    assert.equal(operations.rows.get(requested.challengeId)!.attempts, 1);

    const verified = await service.verify({
      challengeId: requested.challengeId,
      purpose: "registration",
      phone: INTERNATIONAL,
      email: "u@example.com",
      code: mailer.sent[0]!.code,
    });
    assert.ok(verified.verificationProof.length > 32);

    // a verified challenge cannot be verified again
    await assert.rejects(
      service.verify({
        challengeId: requested.challengeId,
        purpose: "registration",
        phone: INTERNATIONAL,
        email: "u@example.com",
        code: mailer.sent[0]!.code,
      }),
      /verificationCodeInvalid/,
    );
  }

  // --- egypt: opaque dispatch, one SMS per dispatch ----------------------------
  {
    const { service, operations, dispatcher } = build();
    const web = await service.request(
      { purpose: "password_recovery", phone: EGYPT, uid: "u1", runtime: "web" },
      "1.1.1.1",
    );
    assert.equal(web.channel, VerificationChannels.EgyptAdminSms);
    assert.equal(
      JSON.stringify(web).includes("dispatchTicket"),
      false,
      "no client, browser or native, may receive the dispatch ticket",
    );
    assert.equal(dispatcher.sent.length, 1, "the server dispatches the wake-up signal itself");
    assert.equal(operations.rows.get(web.challengeId)!.dispatchStatus, "pending");

    const native = await service.request(
      { purpose: "registration", phone: EGYPT, runtime: "android" },
      "1.1.1.1",
    );
    assert.equal(
      JSON.stringify(native).includes("dispatchTicket"),
      false,
      "runtime must not change what the requester learns",
    );
    const signal = dispatcher.sent[1]!;
    assert.equal(signal.challengeId, native.challengeId);
    assert.equal(signal.dispatchId, native.dispatchId);
    assert.equal(
      signal.dispatchTicket.includes(EGYPT.slice(1)),
      false,
      "the dispatch ticket must not carry the destination number",
    );

    const redeemed = await service.redeemAdminSms({
      dispatchId: native.dispatchId!,
      dispatchTicket: signal.dispatchTicket,
    });
    assert.equal(redeemed.number, EGYPT);
    assert.equal(redeemed.replyPackage, "hgh.asol.app");
    assert.match(redeemed.message, /\d{6}/);

    // a replayed redemption must not produce a second SMS
    await assert.rejects(
      service.redeemAdminSms({ dispatchId: native.dispatchId!, dispatchTicket: signal.dispatchTicket }),
      /verificationDispatchUnavailable/,
    );

    const code = redeemed.message.match(/\d{6}/)![0];
    const proof = await service.verify({
      challengeId: native.challengeId,
      purpose: "registration",
      phone: EGYPT,
      code,
    });

    // the proof is purpose- and target-bound, and single-use
    await assert.rejects(
      service.consumeProof(proof.verificationProof, { purpose: "password_recovery", phone: EGYPT }),
      /verificationProofPurposeMismatch/,
    );
    await assert.rejects(
      service.consumeProof(proof.verificationProof, { purpose: "registration", phone: "+201111111111" }),
      /verificationProofPhoneMismatch/,
    );
    await service.consumeProof(proof.verificationProof, { purpose: "registration", phone: EGYPT });
    await assert.rejects(
      service.consumeProof(proof.verificationProof, { purpose: "registration", phone: EGYPT }),
      /verificationProofInvalid/,
    );
  }

  // --- gateway unavailable: retriable failure, never an email downgrade -------
  {
    const { service, operations, mailer, dispatcher } = build();
    dispatcher.outcome = { delivered: false, failureCode: "smsGatewayUnavailable" };
    await assert.rejects(
      service.request({ purpose: "registration", phone: EGYPT, runtime: "web" }, "1.1.1.1"),
      /verificationSmsGatewayUnavailable/,
    );
    assert.equal(mailer.sent.length, 0, "an Egyptian number must never fall back to email");
    const row = [...operations.rows.values()][0]!;
    assert.equal(row.dispatchStatus, "unavailable");
    assert.equal(row.dispatchFailureCode, "smsGatewayUnavailable");
    assert.equal(row.state, "dispatch_pending", "the challenge stays retriable, not verified");
  }

  // --- resend: cooldown, lineage, rotation ------------------------------------
  {
    const { service, operations, mailer, dispatcher } = build();
    const requested = await service.request(
      { purpose: "primary_phone_change", phone: EGYPT, uid: "u1", runtime: "android" },
      "1.1.1.1",
    );
    const body = { challengeId: requested.challengeId, purpose: "primary_phone_change", phone: EGYPT, uid: "u1", runtime: "android" } as const;

    await assert.rejects(service.resend({ ...body }), /verificationResendCooldown/);

    const row = operations.rows.get(requested.challengeId)!;
    row.updatedAt = new Date(Date.now() - VERIFICATION_RESEND_COOLDOWN_MS - 1_000).toISOString();
    const firstDispatchId = row.dispatchId;

    const resent = await service.resend({ ...body });
    assert.equal(resent.challengeId, requested.challengeId, "resend keeps the same challenge");
    assert.notEqual(resent.dispatchId, firstDispatchId, "resend rotates the dispatch identity");
    assert.equal(operations.rows.get(requested.challengeId)!.resendCount, 1);

    // the superseded dispatch ticket is no longer redeemable
    assert.equal(dispatcher.sent.length, 2, "resend dispatches a fresh wake-up signal");
    await assert.rejects(
      service.redeemAdminSms({
        dispatchId: firstDispatchId!,
        dispatchTicket: dispatcher.sent[0]!.dispatchTicket,
      }),
      /verificationDispatch/,
    );
    assert.equal(mailer.sent.length, 0, "an Egyptian challenge never falls back to email");
  }
}

main()
  .then(() => console.log("verification service tests passed."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
