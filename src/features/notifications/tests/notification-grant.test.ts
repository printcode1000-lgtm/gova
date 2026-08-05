import assert from "node:assert/strict";
import {
  createNotificationGrant,
  verifyNotificationGrant,
} from "../services/notification-grant.server";

// The signing secret is supplied by the npm script, not set here: touching the
// environment outside the Configuration layer is an architecture violation, and
// the check enforces it.

const send = {
  uids: ["usr_1", "usr_2"],
  templateId: "order.created",
  dedupeKey: "orders.created:ord_1:buyer:usr_1",
  variables: { orderNumber: "A-1" },
};

// ── A grant round-trips exactly what was signed ──────────────────────────────

const grant = createNotificationGrant(send, { actorUid: "usr_1" });
const verified = verifyNotificationGrant(grant);
assert.deepEqual(verified.send.uids, ["usr_1", "usr_2"]);
assert.equal(verified.send.templateId, "order.created");
assert.equal(verified.actorUid, "usr_1");

// ── The browser cannot widen what a grant authorises ─────────────────────────
//
// This is the whole security model: the payload is signed, not just the
// recipients, so adding a uid or rewriting the body invalidates the signature.

const [encoded, signaturePart] = grant.split(".");
const tampered = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
tampered.send.uids.push("usr_victim");
const forged = `${Buffer.from(JSON.stringify(tampered)).toString("base64url")}.${signaturePart}`;
assert.throws(
  () => verifyNotificationGrant(forged),
  /notificationGrantInvalid/,
  "A grant with an added recipient must be rejected.",
);

// ── Expiry is enforced ───────────────────────────────────────────────────────

const expired = createNotificationGrant(send, { ttlMs: -1 });
assert.throws(
  () => verifyNotificationGrant(expired),
  /notificationGrantExpired/,
  "An expired grant must be rejected.",
);

// ── Malformed input is rejected rather than crashing ─────────────────────────

for (const bad of ["", "no-dot", "a.b", `${encoded}.`]) {
  assert.throws(
    () => verifyNotificationGrant(bad),
    /notificationGrant(Invalid|Expired)/,
    `Malformed grant must be rejected: ${JSON.stringify(bad)}`,
  );
}

// ── A grant must name recipients and a dedupe key ────────────────────────────

assert.throws(
  () => createNotificationGrant({ ...send, uids: [] }),
  /notificationGrantRecipientsRequired/,
);
assert.throws(
  () => createNotificationGrant({ ...send, dedupeKey: "" }),
  /notificationGrantDedupeKeyRequired/,
);

console.log("Notification grant tests passed.");
