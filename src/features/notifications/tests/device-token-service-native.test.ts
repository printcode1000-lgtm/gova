/**
 * Behaviour test: a native registration and the credential unlock it triggers.
 *
 * Unlock authorises with the signed session, so a registration may only unlock
 * for the session that owns the token. It must never block the registration
 * itself, and a server that refuses the token must roll the device back so the
 * switch cannot claim a registration the server does not have.
 */

import assert from "node:assert/strict";

import type { DeviceToken } from "@asol/notifications-core";

(globalThis as { window?: unknown }).window ??= {
  location: { origin: "https://localhost" },
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
};

const UID = "usr_native";
const PHONE = "+201000000002";
const NOTIFICATIONS_ORIGIN = "https://notifications.test";

const fetched: Array<{ url: string; session: string | null }> = [];
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  fetched.push({
    url: String(input),
    session: new Headers(init?.headers).get("x-asol-session-token"),
  });
  return new Response("{}", { status: 503 });
}) as typeof fetch;

function nativeToken(): DeviceToken {
  const now = new Date().toISOString();
  return {
    id: `ntok_${UID}_android`,
    uid: UID,
    platform: "android",
    provider: "fcm",
    deviceId: "android:94f62f8f",
    token: "fcm-token",
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function run(): Promise<void> {
  const { NativeCore } = await import("@asol/native-core");
  NativeCore.getPreference = async () => ({ ok: true, value: { value: "" } }) as never;
  NativeCore.setPreference = async () => ({ ok: true, value: undefined }) as never;
  NativeCore.removePreference = async () => ({ ok: true, value: undefined }) as never;

  const { configureAccountBridge } = await import("@asol/account-bridge");
  const { DeviceTokenService } = await import("../application/device-token-service");
  const { nativePushService } = await import("../infrastructure/native/native-push.service");
  const { notificationApiService } = await import(
    "../infrastructure/http/notification-api-service"
  );
  const { asolNotificationRepository } = await import(
    "../infrastructure/asol-notification-repository"
  );
  const { setNotificationGrantDeliveryIdentity, getNotificationGrantDeliveryIdentity } =
    await import("../domain/notification-grant-delivery-context");

  configureAccountBridge({
    publicEnv: {
      developmentBuild: false,
      basePath: "",
      mode: "static",
      apiBaseUrl: "https://main.test",
      controlUrl: "https://control.test",
      notificationsUrl: NOTIFICATIONS_ORIGIN,
      productsUrl: "https://products.test",
      ordersUrl: "https://orders.test",
      profilesUrl: "https://profiles.test",
      submainUrl: "https://submain.test",
      sub2mainUrl: "https://sub2main.test",
      mobilePushCredentialBlob: "b".repeat(64),
    },
    getNotificationGrantDeliveryIdentity,
  });

  let stored: DeviceToken[] = [];
  let rolledBack = 0;
  let serverRefuses = false;
  nativePushService.isNativePush = () => true;
  nativePushService.register = async () => nativeToken();
  nativePushService.unregister = async () => {
    rolledBack += 1;
  };
  notificationApiService.registerToken = (async () => {
    if (serverRefuses) throw new Error("forbidden");
    return nativeToken();
  }) as typeof notificationApiService.registerToken;
  asolNotificationRepository.saveDeviceToken = async (token: DeviceToken) => {
    stored = [token];
  };

  const service = new DeviceTokenService();
  const unlockCalls = () =>
    fetched.filter((call) => call.url.endsWith("/api/notifications/mobile-push/unlock"));

  // ── no session carrying grants: register, but never unlock ─────────────────
  setNotificationGrantDeliveryIdentity(null);
  assert.ok(await service.register(UID, PHONE));
  assert.equal(stored.length, 1);
  assert.equal(unlockCalls().length, 0, "unlock needs the owning session");

  // ── another account's session: never unlock with it ───────────────────────
  setNotificationGrantDeliveryIdentity({ uid: "usr_other", phone: PHONE, sessionToken: "other.session" });
  await service.register(UID, PHONE);
  assert.equal(unlockCalls().length, 0, "a different account's session must not unlock");

  // ── the owning session: unlock with its token, and a refusal never blocks ──
  setNotificationGrantDeliveryIdentity({ uid: UID, phone: PHONE, sessionToken: "owner.session" });
  const token = await service.register(UID, PHONE);
  assert.ok(token, "a refused unlock must not fail the registration");
  assert.equal(unlockCalls().length, 1);
  assert.equal(unlockCalls()[0]!.session, "owner.session");
  assert.equal(unlockCalls()[0]!.url, `${NOTIFICATIONS_ORIGIN}/api/notifications/mobile-push/unlock`);

  // ── a server refusal rolls the device back ────────────────────────────────
  serverRefuses = true;
  await assert.rejects(service.register(UID, PHONE), /forbidden/);
  assert.equal(rolledBack, 1, "the native opt-in flag must be rolled back");

  // ── the identity leaf refuses an identity without a session ───────────────
  setNotificationGrantDeliveryIdentity({ uid: UID, phone: PHONE, sessionToken: "  " });
  assert.equal(getNotificationGrantDeliveryIdentity(), null);

  console.log("Device token service native tests passed.");
}

void run().catch((error) => {
  console.error(error);
  process.exit(1);
});
