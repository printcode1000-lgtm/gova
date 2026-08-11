import assert from "node:assert/strict";

import { summarizeNotificationSendResponse } from "../notification-bridge.client";

assert.deepEqual(
  summarizeNotificationSendResponse({
    accepted: 3,
    results: [
      { results: [{ uid: "sent", status: "sent" }] },
      { results: [{ uid: "queued", status: "queued" }] },
      { results: [{ uid: "none", status: "no_tokens" }] },
    ],
  }),
  { delivered: 2, unavailable: 1 },
  "Only sent/queued/partial recipient outcomes count as delivered",
);

assert.deepEqual(
  summarizeNotificationSendResponse({
    accepted: 2,
    results: [
      { results: [{ uid: "partial", status: "partial" }] },
      { results: [{ uid: "failed", status: "failed" }] },
    ],
  }),
  { delivered: 1, unavailable: 1 },
);

assert.deepEqual(
  summarizeNotificationSendResponse({ accepted: 0, results: [{ error: "invalid" }] }),
  { delivered: 0, unavailable: 0 },
  "A rejected grant has no fabricated recipient result",
);

console.log("Notification bridge outcome tests passed.");
