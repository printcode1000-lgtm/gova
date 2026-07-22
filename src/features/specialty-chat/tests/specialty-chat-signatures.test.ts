import assert from "node:assert/strict";
import {
  createSignedSessionToken,
  verifySignedSessionToken,
} from "@/features/auth/services/signed-session-token.server";
import {
  createSpecialtyChatCapability,
  verifySpecialtyChatCapability,
} from "../services/specialty-chat-capability.server";

const session = createSignedSessionToken("buyer", "01000000000");
assert.equal(verifySignedSessionToken(session).uid, "buyer");
assert.throws(() => verifySignedSessionToken(`${session}x`), /sessionTokenInvalid/);

const capability = createSpecialtyChatCapability({
  requestId: "req_12345678",
  buyerUid: "buyer",
  sellerUid: "seller",
});
assert.equal(verifySpecialtyChatCapability(capability).sellerUid, "seller");
assert.throws(
  () => verifySpecialtyChatCapability(`${capability}x`),
  /specialtyChatCapabilityInvalid/,
);
const expired = createSpecialtyChatCapability({
  requestId: "req_87654321",
  buyerUid: "buyer",
  sellerUid: "seller",
  expiresAt: Date.now() - 1,
});
assert.throws(() => verifySpecialtyChatCapability(expired), /specialtyChatCapabilityExpired/);

console.log("Specialty chat signature tests passed.");

