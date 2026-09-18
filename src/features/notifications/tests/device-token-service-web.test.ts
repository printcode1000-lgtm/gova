/**
 * Behaviour test: a browser's push registration keeps its local record.
 *
 * The web regression: `WebPushBrowserService.subscribe` registered on the
 * server but nothing was stored locally, so the settings page could never
 * confirm this browser — "could not load the device list" on every visit and
 * a switch that reported failure. This drives the real `DeviceTokenService`
 * with its collaborators replaced in memory.
 */

import assert from "node:assert/strict";

import type { DeviceToken } from "@asol/notifications-core";

// A browser-shaped global, so the modules load as they do in a web page.
(globalThis as { window?: unknown }).window ??= {
  location: { origin: "https://localhost" },
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};

const UID = "usr_web";
const PHONE = "+201000000001";

function registered(deviceId: string): DeviceToken {
  const now = new Date().toISOString();
  return {
    id: `ntok_${UID}_web`,
    uid: UID,
    platform: "web",
    provider: "web_push",
    deviceId,
    token: '{"endpoint":"https://push.test/1"}',
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function run(): Promise<void> {
  const { DeviceTokenService } = await import("../application/device-token-service");
  const { webPushBrowserService } = await import(
    "../infrastructure/web-push/web-push-browser.service"
  );
  const { nativePushService } = await import("../infrastructure/native/native-push.service");
  const { asolNotificationRepository } = await import(
    "../infrastructure/asol-notification-repository"
  );

  // ── in-memory collaborators ────────────────────────────────────────────────
  let stored: DeviceToken[] = [];
  let hasSubscription = false;
  let subscribeCalls = 0;
  let subscribeFails = false;

  nativePushService.isNativePush = () => false;
  nativePushService.unregister = async () => undefined;
  webPushBrowserService.isSupported = () => true;
  webPushBrowserService.hasSubscription = async () => hasSubscription;
  webPushBrowserService.subscribe = async () => {
    subscribeCalls += 1;
    if (subscribeFails) throw new Error("notificationPermissionDenied");
    hasSubscription = true;
    return {
      deviceId: "web:d29d6d79",
      subscription: {} as PushSubscription,
      registered: registered("web:d29d6d79"),
    };
  };
  asolNotificationRepository.saveDeviceToken = async (token: DeviceToken) => {
    stored = [token, ...stored.filter((item) => item.platform !== token.platform)];
  };
  asolNotificationRepository.listDeviceTokens = async (uid: string) =>
    stored.filter((token) => token.uid === uid);
  asolNotificationRepository.removeDeviceToken = async (_uid: string, id: string) => {
    stored = stored.filter((token) => token.id !== id);
  };

  const service = new DeviceTokenService();

  // ── enabling records the server-accepted row locally ──────────────────────
  await service.enable(UID, PHONE);
  assert.equal(subscribeCalls, 1);
  const local = await service.list(UID);
  assert.deepEqual(
    local.map((token) => [token.deviceId, token.enabled]),
    [["web:d29d6d79", true]],
    "a subscribed browser must keep the local record the settings page confirms against",
  );

  // ── reconcile never subscribes a browser the user did not opt in ──────────
  stored = [];
  hasSubscription = false;
  subscribeCalls = 0;
  assert.equal(await service.reconcile(UID, PHONE), null);
  assert.equal(subscribeCalls, 0, "reconciliation must not create a subscription");
  assert.deepEqual(await service.list(UID), []);

  // ── reconcile repairs a subscription that predates the local record ───────
  hasSubscription = true;
  const repaired = await service.reconcile(UID, PHONE);
  assert.equal(repaired?.deviceId, "web:d29d6d79");
  assert.equal(subscribeCalls, 1);
  assert.equal((await service.list(UID)).length, 1, "the repaired row is recorded");

  // ── a failed repair fails closed: no stale local record survives ──────────
  subscribeFails = true;
  await assert.rejects(service.reconcile(UID, PHONE), /notificationPermissionDenied/);
  assert.deepEqual(
    await service.list(UID),
    [],
    "a failed repair must not leave a local record that claims a registration",
  );

  console.log("Device token service web tests passed.");
}

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
