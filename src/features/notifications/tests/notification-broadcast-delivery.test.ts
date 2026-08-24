import assert from "node:assert/strict";

import {
  mergeBroadcastDeliveryResult,
  mergeNotificationTestDeliveryResult,
  prepareNotificationTestRequest,
} from "../application/services/notification-api-service";

const granted = {
  requested: 3,
  recipientMode: "selected" as const,
  notificationGrants: ["signed"],
  results: ["u1", "u2", "u3"].map((uid) => ({
    uid,
    tokenCount: 0,
    status: "granted" as const,
  })),
};

const merged = mergeBroadcastDeliveryResult(granted, [
  { uid: "u1", tokenCount: 2, status: "sent" },
  { uid: "u2", tokenCount: 1, status: "queued" },
  // A response cannot widen the signed audience.
  { uid: "unexpected", tokenCount: 1, status: "sent" },
]);

assert.deepEqual(
  merged.results,
  [
    { uid: "u1", tokenCount: 2, status: "sent" },
    { uid: "u2", tokenCount: 1, status: "queued" },
    { uid: "u3", tokenCount: 0, status: "failed" },
  ],
  "The UI must show provider outcomes and mark missing recipients as failed",
);
assert.equal(merged.requested, 3);
assert.equal(merged.recipientMode, "selected");

const testMerged = mergeNotificationTestDeliveryResult(
  {
    requested: 1,
    notificationGrants: ["signed-test"],
    scenarioId: "orders",
    channelId: "asol_orders_v4",
    dedupeKey: "notification-test:one",
    results: [
      { uid: "admin", tokenCount: 0, status: "granted" as const },
    ],
  },
  [
    { uid: "admin", tokenCount: 1, status: "sent" },
    { uid: "unexpected", tokenCount: 4, status: "sent" },
  ],
);

assert.deepEqual(testMerged.results, [
  { uid: "admin", tokenCount: 1, status: "sent" },
]);
assert.equal(testMerged.channelId, "asol_orders_v4");
assert.equal(testMerged.dedupeKey, "notification-test:one");

const prepared = prepareNotificationTestRequest({
  identity: {
    uid: "admin",
    phone: "01000000000",
    sessionToken: "signed-session-token",
  },
  scenarioId: "general",
  title: "test",
  body: "body",
});
assert.equal(
  prepared.headers["x-asol-session-token"],
  "signed-session-token",
  "The signed Super Admin session must be sent in the verification header.",
);
assert.equal(
  "sessionToken" in prepared.body.identity,
  false,
  "The session token must never be serialized in the request body.",
);

console.log("Notification broadcast delivery tests passed.");
