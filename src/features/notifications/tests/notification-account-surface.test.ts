/**
 * Contract test: the account-facing notification surface.
 *
 * Two operations here are reachable by any signed-in user — listing the
 * account's devices and sending it a test push — so what they may read from a
 * request, and what they may put on the wire, is the contract.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  SELF_TEST_NOTIFICATION_DELIVERY,
  SELF_TEST_NOTIFICATION_SOURCE,
  selfTestNotificationContent,
} from "@asol/notifications-core";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const devicesRoute = source("src/app/api/notifications/devices/route.ts");
const selfTestRoute = source("src/app/api/notifications/test/self/route.ts");
const tokenService = source(
  "src/features/notifications/server/services/notification-token-service.server.ts",
);
const selfTestService = source(
  "src/features/notifications/server/services/notification-self-test.service.server.ts",
);
const apiService = source(
  "src/features/notifications/infrastructure/http/notification-api-service.ts",
);
const commands = source(
  "src/features/notifications/application/public/notification-commands.ts",
);
const deviceToggle = source(
  "src/features/settings/presentation/use-notification-device-toggle.ts",
);
const rootLayout = source("src/app/layout.tsx");
const preferencesProvider = source(
  "src/shared/preferences/PreferencesProvider.tsx",
);

// The identity is the verified session on both routes, never the payload.
for (const route of [devicesRoute, selfTestRoute]) {
  assert.match(route, /assertSignedInRequest\(request\)/);
  assert.match(route, /uid: claims\.uid/);
  assert.match(route, /phone: claims\.phone/);
  assert.doesNotMatch(route, /searchParams\.get\("uid"\)/);
  assert.doesNotMatch(route, /body\.identity/);
}

// The test push carries no caller-supplied content: only a locale is read.
assert.doesNotMatch(selfTestRoute, /body\?\.(title|body|routeHref)/);
assert.match(selfTestRoute, /locale/);

// A listing proves ownership and never carries the delivery credential.
assert.match(tokenService, /async listForAccount/);
assert.match(tokenService, /identityPhoneMatches\(user\.phone, identity\?\.phone\)/);
assert.match(tokenService, /normalizedIdentityPhone/);
const summaryMapper = tokenService.slice(
  tokenService.indexOf("function toAccountDeviceSummary"),
  tokenService.indexOf("export class NotificationTokenService"),
);
assert.doesNotMatch(summaryMapper, /\btoken:/);

// Incomplete legacy sessions must never issue account notification requests.
assert.match(deviceToggle, /if \(!session\?\.uid \|\| !session\.phone\)/);
assert.match(
  deviceToggle,
  /if \(!session\?\.uid \|\| !session\.phone \|\| deviceBusy\) return;/,
);

// Notification UI is always below the locale runtime. This guards the prompt's
// useTranslation() dependency and prevents provider-order regressions.
assert.match(
  rootLayout,
  /<PreferencesProvider>[\s\S]*<NotificationsFeatureBridge>/,
);
assert.match(preferencesProvider, /<LocaleRuntimeProvider/);

// The self test authorises one uid — the verified caller's — and no other.
assert.match(selfTestService, /uids: \[user\.uid\]/);
assert.match(selfTestService, /if \(!user \|\| !phone \|\| user\.phone !== phone\)/);
assert.match(selfTestService, /selfTestNotificationContent/);

// The client sends the session as a header and nothing else identifying.
assert.match(apiService, /"x-asol-session-token": token/);
assert.match(apiService, /listAccountDevices\(sessionToken: string\)/);
assert.match(apiService, /revokeAccountDevice\(/);

// The command vocabulary names all three operations.
for (const type of [
  "listAccountDevices",
  "revokeAccountDevice",
  "sendSelfTest",
]) {
  assert.ok(
    commands.includes(`"${type}",`),
    `Missing command type: ${type}`,
  );
}

// The test push's content is fixed, localised, and routed back to this page.
assert.equal(selfTestNotificationContent("en").title, "Test notification");
assert.notEqual(selfTestNotificationContent("ar").title, "");
assert.equal(selfTestNotificationContent(undefined).title, selfTestNotificationContent("ar").title);
assert.equal(SELF_TEST_NOTIFICATION_DELIVERY.routeHref, "/settings/notifications");
assert.equal(SELF_TEST_NOTIFICATION_SOURCE, "account_notification_self_test");

console.log("Notification account surface tests passed.");
