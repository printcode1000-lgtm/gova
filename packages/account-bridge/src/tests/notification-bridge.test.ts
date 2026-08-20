import assert from "node:assert/strict";

import { summarizeNotificationSendResponse } from "@asol/account-bridge/notifications";

assert.deepEqual(
  summarizeNotificationSendResponse({
    accepted: 3,
    results: [
      { results: [{ uid: "sent", tokenCount: 1, status: "sent" }] },
      { results: [{ uid: "queued", tokenCount: 1, status: "queued" }] },
      { results: [{ uid: "none", tokenCount: 0, status: "no_tokens" }] },
    ],
  }),
  {
    delivered: 2,
    unavailable: 1,
    recipientResults: [
      { uid: "sent", tokenCount: 1, status: "sent" },
      { uid: "queued", tokenCount: 1, status: "queued" },
      { uid: "none", tokenCount: 0, status: "no_tokens" },
    ],
  },
  "Only sent/queued/partial recipient outcomes count as delivered",
);

assert.deepEqual(
  summarizeNotificationSendResponse({
    accepted: 2,
    results: [
      { results: [{ uid: "partial", tokenCount: 2, status: "partial" }] },
      { results: [{ uid: "failed", tokenCount: 1, status: "failed" }] },
    ],
  }),
  {
    delivered: 1,
    unavailable: 1,
    recipientResults: [
      { uid: "partial", tokenCount: 2, status: "partial" },
      { uid: "failed", tokenCount: 1, status: "failed" },
    ],
  },
);

assert.deepEqual(
  summarizeNotificationSendResponse({ accepted: 0, results: [{ error: "invalid" }] }),
  { delivered: 0, unavailable: 0, recipientResults: [] },
  "A rejected grant has no fabricated recipient result",
);

console.log("Notification bridge outcome tests passed.");
