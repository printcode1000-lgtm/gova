import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The terminal production-deploy callback's two standing obligations.
 *
 * A release finishes whether or not a Super Admin browser is open, so the
 * callback — not the console — is what delivers the deployment notification and
 * the email. That makes two properties load-bearing, and neither is visible in
 * a type:
 *
 * 1. **Exactly once.** The callback can be retried, and the release worker may
 *    call it again after control is redeployed mid-release. Delivery is guarded
 *    by the snapshot's `inAppNotified` / `emailStatus` flags, and the handler
 *    records the flag back so a retry is a no-op instead of a second push.
 * 2. **One allowlisted cross-deployment call.** Sending the already-signed grant
 *    to the notifications runtime is the single operational exception to "no
 *    application backend calls a sibling ASOL backend". It must stay a named,
 *    single-purpose path — never a general HTTP helper other code can reuse.
 *
 * These are asserted against the source because the behaviour lives in a
 * server-only module that reaches a shard and a push provider; a runtime test
 * would have to stub both and would then prove only that the stubs were called.
 */
const ROOT = process.cwd();
const HANDLER = path.join(
  ROOT,
  "src/features/release-commands/server/services/production-deploy-service.server.ts",
);
const DELIVERY = path.join(
  ROOT,
  "src/features/release-commands/server/services/production-deploy-notification-delivery.server.ts",
);

const handler = readFileSync(HANDLER, "utf8");
const delivery = readFileSync(DELIVERY, "utf8");

const callback = handler.slice(handler.indexOf("export async function handleProductionDeployCallback("));
assert.ok(callback.length > 0, "handleProductionDeployCallback must exist.");

/** The in-app notification is delivered only when the snapshot says it was not. */
assert.match(
  callback,
  /if \(!snapshot\.inAppNotified\) \{/,
  "The in-app deployment notification must be guarded by the snapshot's inAppNotified flag.",
);
assert.match(
  callback,
  /recordRemoteDeployAllNotification\(\{[\s\S]*?inAppNotified: true/,
  "After delivering, the callback must record inAppNotified so a retry does not notify twice.",
);

/** The email has the same shape: skipped when already sent, recorded after sending. */
assert.match(
  callback,
  /if \(snapshot\.emailStatus === "sent"\) return \{ received: true \}/,
  "A snapshot that already reported its email must not send a second one.",
);
assert.match(
  callback,
  /recordRemoteDeployAllNotification\(\{[\s\S]*?emailStatus: "sent"/,
  "After sending, the callback must record emailStatus so a retry does not email twice.",
);

/** Delivery failure must not fail the release: the deployment already happened. */
assert.match(
  callback,
  /try \{[\s\S]*?deliverProductionDeployNotificationGrants[\s\S]*?\} catch/,
  "A failed notification must not fail a release that already succeeded.",
);

/** The one allowlisted sibling call, and nothing more general. */
const notificationsCalls = [...delivery.matchAll(/fetch\(`\$\{[^`]*\}\/api\/[^`]*`/g)].map(
  (match) => match[0],
);
assert.equal(
  notificationsCalls.length,
  1,
  "The delivery module may reach exactly one sibling endpoint.",
);
assert.match(
  notificationsCalls[0]!,
  /\/api\/notifications\/send`$/,
  "The only allowlisted cross-deployment business call is the notifications send endpoint.",
);
assert.doesNotMatch(
  delivery,
  /export (async )?function (asolFetch|siblingFetch|serviceFetch)/,
  "This exception must not become a general sibling-backend HTTP helper.",
);

console.log("production-deploy callback guard tests passed.");
