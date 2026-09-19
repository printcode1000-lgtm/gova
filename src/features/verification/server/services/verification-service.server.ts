import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";
import { VerificationOperations } from "@asol/data-core/verification";
import {
  VERIFICATION_CODE_TTL_MS,
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_DISPATCH_TICKET_TTL_MS,
  VERIFICATION_MAX_CODE_ATTEMPTS,
  VERIFICATION_MAX_IP_REQUESTS,
  VERIFICATION_MAX_RESENDS,
  VERIFICATION_MAX_TARGET_REQUESTS,
  VERIFICATION_PROOF_TTL_MS,
  VERIFICATION_RATE_WINDOW_MS,
  VERIFICATION_RESEND_COOLDOWN_MS,
  VerificationChannels,
  VerificationClientRuntimes,
  VerificationDispatchStatuses,
  VerificationStates,
  assertInternationalEmail,
  assertVerificationTransition,
  assertVerificationPurpose,
  assertVerificationRuntime,
  normalizeVerificationEmail,
  normalizeVerificationPhone,
  verificationChannelForPhone,
  type VerificationChannel,
  type VerificationClientRuntime,
  type VerificationPurpose,
} from "@asol/verification-core";
import {
  createSmsAuthorizationClaims,
  createVerificationCode,
  createVerificationId,
  signSmsAuthorization,
  signVerificationDispatchTicket,
  signVerificationProof,
  verificationDigest,
  verifyVerificationDispatchTicket,
} from "@asol/verification-core/server";
import { getVerificationConfig } from "@/core/config/server-env";
import { verificationSmsDispatchService } from "@/features/notifications/server";
import { VerificationProofConsumer } from "./verification-proof-consumer.server";
import { VerificationEmailService } from "./verification-email-service.server";
import type {
  VerificationAdminSmsRedeemBody,
  VerificationAdminSmsRedeemResult,
  VerificationAdminSmsStatusBody,
  VerificationRequestBody,
  VerificationRequestResult,
  VerificationResendBody,
  VerificationVerifyBody,
  VerificationVerifyResult,
} from "../../application/types";

export class VerificationService {
  private readonly proofs: VerificationProofConsumer;

  constructor(
    private readonly operations = new VerificationOperations(),
    private readonly mailer = new VerificationEmailService(),
    proofs?: VerificationProofConsumer,
    private readonly dispatcher = verificationSmsDispatchService,
  ) {
    // The consumer shares this service's challenge store so a single-use claim is
    // decided by one source of truth.
    this.proofs = proofs ?? new VerificationProofConsumer(operations);
  }

  private secret(): string {
    return getVerificationConfig().signingSecret;
  }

  private digest(value: string): string {
    return verificationDigest(this.secret(), value);
  }

  async request(input: VerificationRequestBody, requestIp: string): Promise<VerificationRequestResult> {
    const purpose = assertVerificationPurpose(input.purpose);
    const runtime = assertVerificationRuntime(input.runtime);
    const phone = normalizeVerificationPhone(input.phone);
    const channel = verificationChannelForPhone(phone);
    const email = normalizeVerificationEmail(input.email);
    assertInternationalEmail(channel, email);

    const now = new Date();
    const since = new Date(now.getTime() - VERIFICATION_RATE_WINDOW_MS).toISOString();
    const ipHash = this.digest(`ip:${requestIp || "unknown"}`);
    const [targetRequests, ipRequests] = await this.operations.countRecent(phone, purpose, ipHash, since);
    if (targetRequests >= VERIFICATION_MAX_TARGET_REQUESTS || ipRequests >= VERIFICATION_MAX_IP_REQUESTS) {
      throw new Error("verificationRateLimited");
    }

    const code = channel === VerificationChannels.InternationalEmail ? createVerificationCode() : "";
    const challengeId = createVerificationId("vch");
    const dispatch = this.createDispatchIdentity(channel, challengeId, now);

    await this.operations.createChallenge({
      id: challengeId,
      purpose,
      channel,
      state:
        channel === VerificationChannels.EgyptAdminSms
          ? VerificationStates.DispatchPending
          : VerificationStates.CodeSent,
      uid: input.uid?.trim() || null,
      phoneE164: phone,
      email,
      codeHash: this.digest(`code:${challengeId}:${code || "pending-dispatch"}`),
      requestIpHash: ipHash,
      requesterDeviceHash: null,
      expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL_MS).toISOString(),
      attempts: 0,
      resendCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      dispatchId: dispatch.dispatchId,
      dispatchNonceHash: dispatch.dispatchNonceHash,
      dispatchExpiresAt: dispatch.dispatchExpiresAt,
      dispatchStatus: dispatch.dispatchId ? "pending" : null,
    });

    if (channel === VerificationChannels.InternationalEmail) {
      await this.mailer.sendCode({ email: email!, code, purpose });
      return { challengeId, purpose, channel, expiresInSeconds: Math.floor(VERIFICATION_CODE_TTL_MS / 1000) };
    }

    return this.dispatchEgyptianSms({
      challengeId,
      purpose,
      dispatch,
      runtime,
    });
  }

  /** Fresh dispatch identity for the Egyptian SMS channel; all-null otherwise. */
  private createDispatchIdentity(channel: VerificationChannel, challengeId: string, now: Date) {
    if (channel !== VerificationChannels.EgyptAdminSms) {
      return {
        dispatchId: null,
        dispatchNonceHash: null,
        dispatchExpiresAt: null,
        dispatchTicket: null as string | null,
      };
    }
    const dispatchId = createVerificationId("vdp");
    const nonce = randomBytes(18).toString("base64url");
    return {
      dispatchId,
      dispatchNonceHash: this.digest(`dispatch:${dispatchId}:${nonce}`),
      dispatchExpiresAt: new Date(now.getTime() + VERIFICATION_DISPATCH_TICKET_TTL_MS).toISOString(),
      dispatchTicket: signVerificationDispatchTicket(
        { challengeId, dispatchId, nonce, issuedAt: Date.now() },
        { secret: () => this.secret() },
      ) as string | null,
    };
  }

  /**
   * Resend keeps the same challenge row (lineage, rate-limit history, purpose and
   * target bindings) and rotates only the secret material: a new code for the
   * email channel, a new dispatch id/ticket for the Egyptian SMS channel. The
   * previous code and dispatch ticket stop working.
   */
  async resend(input: VerificationResendBody): Promise<VerificationRequestResult> {
    const purpose = assertVerificationPurpose(input.purpose);
    const runtime = assertVerificationRuntime(input.runtime);
    const phone = normalizeVerificationPhone(input.phone);
    const email = normalizeVerificationEmail(input.email);
    const challenge = await this.operations.findById(input.challengeId);
    const now = new Date();
    const nowIso = now.toISOString();
    if (
      !challenge ||
      challenge.purpose !== purpose ||
      challenge.phoneE164 !== phone ||
      (challenge.uid ?? null) !== (input.uid?.trim() || null) ||
      (challenge.email ?? null) !== email ||
      challenge.verifiedAt ||
      challenge.consumedAt ||
      challenge.cancelledAt
    ) {
      throw new Error("verificationChallengeInvalid");
    }
    if (challenge.resendCount >= VERIFICATION_MAX_RESENDS) {
      throw new Error("verificationRateLimited");
    }
    const lastActivity = Date.parse(challenge.updatedAt || challenge.createdAt);
    if (Number.isFinite(lastActivity) && now.getTime() - lastActivity < VERIFICATION_RESEND_COOLDOWN_MS) {
      throw new Error("verificationResendCooldown");
    }

    const dispatch = this.createDispatchIdentity(challenge.channel, challenge.id, now);
    const nextState =
      challenge.channel === VerificationChannels.EgyptAdminSms
        ? VerificationStates.DispatchPending
        : VerificationStates.CodeSent;
    assertVerificationTransition(challenge.state, nextState);

    const code = challenge.channel === VerificationChannels.InternationalEmail ? createVerificationCode() : "";
    const rotated = await this.operations.rotateForResend({
      id: challenge.id,
      codeHash: this.digest(`code:${challenge.id}:${code || "pending-dispatch"}`),
      state: nextState,
      expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL_MS).toISOString(),
      dispatchId: dispatch.dispatchId,
      dispatchNonceHash: dispatch.dispatchNonceHash,
      dispatchExpiresAt: dispatch.dispatchExpiresAt,
      dispatchStatus: dispatch.dispatchId ? "pending" : null,
      now: nowIso,
    });
    if (!rotated) throw new Error("verificationChallengeInvalid");

    if (challenge.channel === VerificationChannels.InternationalEmail) {
      await this.mailer.sendCode({ email: challenge.email!, code, purpose });
      return {
        challengeId: challenge.id,
        purpose,
        channel: challenge.channel,
        expiresInSeconds: Math.floor(VERIFICATION_CODE_TTL_MS / 1000),
      };
    }

    return this.dispatchEgyptianSms({
      challengeId: challenge.id,
      purpose,
      dispatch,
      runtime,
    });
  }

  /**
   * Hands the wake-up signal to the Super Admin's Android phone and answers the
   * requester with challenge state only.
   *
   * The dispatch ticket is never returned to any client. The requester's runtime
   * is recorded for diagnostics and changes nothing about authorization: web,
   * Android and iOS all take the same server-owned delivery path, which is the
   * only one that works before a user exists (registration) or before they can
   * sign in (password recovery).
   *
   * An unavailable gateway is a retriable delivery failure, never a downgrade to
   * the email channel — an Egyptian number routes through the SMS gateway or not
   * at all.
   */
  private async dispatchEgyptianSms(input: {
    challengeId: string;
    purpose: VerificationPurpose;
    dispatch: ReturnType<VerificationService["createDispatchIdentity"]>;
    runtime: VerificationClientRuntime;
  }): Promise<VerificationRequestResult> {
    const outcome = await this.dispatcher.dispatch({
      challengeId: input.challengeId,
      dispatchId: input.dispatch.dispatchId!,
      dispatchTicket: input.dispatch.dispatchTicket!,
    });
    const now = new Date().toISOString();
    if (!outcome.delivered) {
      await this.operations.recordDispatchStatus(
        input.challengeId,
        VerificationDispatchStatuses.Unavailable,
        outcome.failureCode,
        now,
      );
      throw new Error(
        outcome.failureCode === "smsGatewayUnavailable"
          ? "verificationSmsGatewayUnavailable"
          : "verificationDispatchFailed",
      );
    }
    await this.operations.recordDispatchStatus(
      input.challengeId,
      VerificationDispatchStatuses.Pending,
      null,
      now,
    );
    return {
      challengeId: input.challengeId,
      purpose: input.purpose,
      channel: VerificationChannels.EgyptAdminSms,
      dispatchId: input.dispatch.dispatchId!,
      expiresInSeconds: Math.floor(VERIFICATION_CODE_TTL_MS / 1000),
    };
  }

  async verify(input: VerificationVerifyBody): Promise<VerificationVerifyResult> {
    const purpose = assertVerificationPurpose(input.purpose);
    const phone = normalizeVerificationPhone(input.phone);
    const email = normalizeVerificationEmail(input.email);
    if (
      typeof input.code !== "string" ||
      !new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`).test(input.code)
    ) {
      throw new Error("verificationCodeInvalid");
    }
    const challenge = await this.operations.findById(input.challengeId);
    const now = new Date().toISOString();
    if (
      !challenge ||
      challenge.purpose !== purpose ||
      challenge.phoneE164 !== phone ||
      (challenge.uid ?? null) !== (input.uid?.trim() || null) ||
      (challenge.email ?? null) !== email ||
      challenge.consumedAt ||
      challenge.verifiedAt ||
      challenge.cancelledAt ||
      challenge.expiresAt < now ||
      challenge.attempts >= VERIFICATION_MAX_CODE_ATTEMPTS
    ) {
      throw new Error("verificationCodeInvalid");
    }

    const candidate = this.digest(`code:${challenge.id}:${input.code}`);
    const valid =
      candidate.length === challenge.codeHash.length &&
      timingSafeEqual(Buffer.from(candidate, "hex"), Buffer.from(challenge.codeHash, "hex"));
    if (!valid) {
      await this.operations.recordFailedAttempt(challenge.id, challenge.attempts + 1, now);
      throw new Error("verificationCodeInvalid");
    }

    assertVerificationTransition(challenge.state, VerificationStates.Verified);
    const nonce = randomBytes(18).toString("base64url");
    const claimed = await this.operations.markVerified(
      challenge.id,
      this.digest(`proof:${challenge.id}:${nonce}`),
      now,
    );
    if (!claimed) throw new Error("verificationCodeInvalid");
    return {
      verificationProof: signVerificationProof(
        {
          challengeId: challenge.id,
          purpose: challenge.purpose,
          phone: challenge.phoneE164,
          uid: challenge.uid,
          email: challenge.email,
          channel: challenge.channel,
          nonce,
          issuedAt: Date.now(),
        },
        { secret: () => this.secret() },
      ),
      expiresInSeconds: Math.floor(VERIFICATION_PROOF_TTL_MS / 1000),
    };
  }

  consumeProof(proof: string, expected: {
    purpose: VerificationPurpose;
    phone: string;
    uid?: string | null;
    email?: string | null;
    channel?: VerificationChannel;
  }): Promise<void> {
    return this.proofs.consume(proof, expected);
  }

  async redeemAdminSms(input: VerificationAdminSmsRedeemBody): Promise<VerificationAdminSmsRedeemResult> {
    const ticket = verifyVerificationDispatchTicket(input.dispatchTicket, { secret: () => this.secret() });
    if (ticket.dispatchId !== input.dispatchId) throw new Error("verificationDispatchTicketInvalid");
    const challenge = await this.operations.findByDispatchId(input.dispatchId);
    const now = new Date().toISOString();
    if (
      !challenge ||
      challenge.id !== ticket.challengeId ||
      challenge.channel !== VerificationChannels.EgyptAdminSms ||
      challenge.dispatchRedeemedAt ||
      !challenge.dispatchExpiresAt ||
      challenge.dispatchExpiresAt < now ||
      challenge.expiresAt < now
    ) {
      throw new Error("verificationDispatchUnavailable");
    }
    assertVerificationTransition(challenge.state, VerificationStates.CodeSent);
    const code = createVerificationCode();
    const claimed = await this.operations.markDispatchRedeemed(
      challenge.id,
      this.digest(`code:${challenge.id}:${code}`),
      now,
    );
    // A duplicate redeem must never produce a second SMS carrying a code the
    // challenge no longer stores.
    if (!claimed) throw new Error("verificationDispatchUnavailable");
    const message = `رمز التحقق من ASOL هو: ${code}`;
    const authorization = signSmsAuthorization(
      createSmsAuthorizationClaims({
        requestId: challenge.dispatchId!,
        number: challenge.phoneE164,
        message,
      }),
      {
        secret: () => this.secret(),
        privateKeyPem: getVerificationConfig().smsAuthorizationPrivateKeyPem,
      },
    );
    return {
      requestId: challenge.dispatchId!,
      number: challenge.phoneE164,
      message,
      authorization,
      replyPackage: "hgh.asol.app",
    };
  }

  async recordAdminSmsStatus(input: VerificationAdminSmsStatusBody): Promise<{ success: true }> {
    const challenge = await this.operations.findByDispatchId(input.requestId);
    if (challenge) {
      await this.operations.recordDispatchStatus(
        challenge.id,
        input.status,
        input.errorCode ?? null,
        new Date().toISOString(),
      );
    }
    return { success: true };
  }
}

export const verificationService = new VerificationService();
