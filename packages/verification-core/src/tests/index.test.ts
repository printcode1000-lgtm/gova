import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  VerificationChannels,
  VerificationPurposes,
  VerificationStates,
  assertInternationalEmail,
  assertVerificationTransition,
  canTransitionVerificationState,
  normalizeVerificationPhone,
  verificationChannelForPhone,
} from "../index";
import { generateKeyPairSync } from "node:crypto";
import {
  assertProofBinding,
  createSmsAuthorizationClaims,
  createVerificationCode,
  signSmsAuthorization,
  verifySmsAuthorization,
  signVerificationDispatchTicket,
  signVerificationProof,
  verifyVerificationDispatchTicket,
  verifyVerificationProof,
} from "../server";

const manifest = JSON.parse(
  readFileSync(path.join(process.cwd(), "packages/verification-core/package.json"), "utf8"),
) as { exports: Record<string, unknown> };
assert.deepEqual(Object.keys(manifest.exports).sort(), [".", "./server"].sort());

assert.equal(normalizeVerificationPhone("01026546550"), "+201026546550");
assert.equal(verificationChannelForPhone("+201026546550"), VerificationChannels.EgyptAdminSms);
assert.equal(verificationChannelForPhone("+966501234567"), VerificationChannels.InternationalEmail);
assert.throws(() => assertInternationalEmail(VerificationChannels.InternationalEmail, ""), /verificationEmailRequired/);
assert.doesNotThrow(() => assertInternationalEmail(VerificationChannels.InternationalEmail, "u@example.com"));

const secret = () => "verification-core-test-secret-0123456789abcdef";
const proof = signVerificationProof(
  {
    challengeId: "vch_1",
    purpose: VerificationPurposes.Registration,
    phone: "+201026546550",
    uid: null,
    email: null,
    channel: VerificationChannels.EgyptAdminSms,
    nonce: "n1",
    issuedAt: Date.now(),
  },
  { secret },
);
const claims = verifyVerificationProof(proof, { secret });
assertProofBinding(claims, {
  purpose: VerificationPurposes.Registration,
  phone: "+201026546550",
  uid: null,
  email: null,
});
assert.throws(
  () => assertProofBinding(claims, { purpose: VerificationPurposes.PasswordRecovery, phone: "+201026546550" }),
  /verificationProofPurposeMismatch/,
);

const ticket = signVerificationDispatchTicket(
  { challengeId: "vch_1", dispatchId: "vdp_1", nonce: "n2", issuedAt: Date.now() },
  { secret },
);
assert.equal(verifyVerificationDispatchTicket(ticket, { secret }).dispatchId, "vdp_1");
assert.match(createVerificationCode(), /^\d{6}$/);

assert.ok(canTransitionVerificationState(VerificationStates.DispatchPending, VerificationStates.CodeSent));
assert.ok(canTransitionVerificationState(VerificationStates.CodeSent, VerificationStates.Verified));
assert.ok(canTransitionVerificationState(VerificationStates.Verified, VerificationStates.Consumed));
// Resend rotates an Egyptian challenge back to dispatch_pending without rewinding a claim.
assert.ok(canTransitionVerificationState(VerificationStates.CodeSent, VerificationStates.DispatchPending));
for (const terminal of [VerificationStates.Consumed, VerificationStates.Expired, VerificationStates.Cancelled]) {
  assert.throws(
    () => assertVerificationTransition(terminal, VerificationStates.Verified),
    /verificationChallengeStateInvalid/,
  );
}
assert.throws(
  () => assertVerificationTransition(VerificationStates.DispatchPending, VerificationStates.Consumed),
  /verificationChallengeStateInvalid/,
);
assert.throws(
  () => assertVerificationTransition(VerificationStates.Verified, VerificationStates.CodeSent),
  /verificationChallengeStateInvalid/,
);

// The send authorization is verifiable with a public key alone, so SMS Sender can
// prove an authorization is genuine without holding anything that could mint one.
{
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const number = "+201026546550";
  const message = "code 123456";
  const claims = createSmsAuthorizationClaims({ requestId: "vdp_1", number, message });
  const authorization = signSmsAuthorization(claims, { secret, privateKeyPem });

  const verified = verifySmsAuthorization(authorization, { requestId: "vdp_1", number, message }, { publicKeyPem });
  assert.equal(verified.requestId, "vdp_1");
  assert.equal(verified.aud, "com.hesham.smssender.verification-sms");

  // A tampered body, a swapped destination, or a replayed request id all fail
  // before anything reaches the radio.
  assert.throws(
    () => verifySmsAuthorization(authorization, { requestId: "vdp_1", number, message: "code 000000" }, { publicKeyPem }),
    /verificationSmsAuthorizationInvalid/,
  );
  assert.throws(
    () => verifySmsAuthorization(authorization, { requestId: "vdp_1", number: "+201111111111", message }, { publicKeyPem }),
    /verificationSmsAuthorizationInvalid/,
  );
  assert.throws(
    () => verifySmsAuthorization(authorization, { requestId: "vdp_2", number, message }, { publicKeyPem }),
    /verificationSmsAuthorizationInvalid/,
  );
  // A different key cannot vouch for it.
  const other = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" }).toString();
  assert.throws(
    () => verifySmsAuthorization(authorization, { requestId: "vdp_1", number, message }, { publicKeyPem: other }),
    /verificationSmsAuthorizationInvalid/,
  );
  // Without a configured key the envelope stays shared-secret signed, so an
  // unconfigured deployment still dispatches instead of failing closed.
  const fallback = signSmsAuthorization(claims, { secret, privateKeyPem: null });
  assert.notEqual(fallback, authorization);
  assert.ok(fallback.includes("."));
}

console.log("@asol/verification-core tests passed.");
