import assert from "node:assert/strict";
import Module from "node:module";
import type { RegisteredNotificationToken } from "../domain/entities";
import type { NotificationProviderPayload } from "../services/providers/notification-provider.interface";

/**
 * `web-push` opens no connection here: the transport is replaced before the
 * provider module is loaded, so the test exercises the result mapping only.
 */
const sent: string[] = [];
const vapidDetails: Array<[string, string, string]> = [];
let nextRejection: (() => unknown) | null = null;

const originalRequire = Module.prototype.require;
Module.prototype.require = function patchedRequire(this: unknown, id: string) {
  if (id === "web-push") {
    return {
      setVapidDetails: (subject: string, publicKey: string, privateKey: string) => {
        vapidDetails.push([subject, publicKey, privateKey]);
      },
      sendNotification: async (subscription: { endpoint: string }) => {
        sent.push(subscription.endpoint);
        const rejection = nextRejection?.();
        if (rejection) throw rejection;
        return { statusCode: 201 };
      },
    };
  }
  return originalRequire.call(this, id);
} as typeof Module.prototype.require;

function token(id: string, endpoint: string): RegisteredNotificationToken {
  return {
    id,
    uid: "usr_1",
    platform: "web",
    provider: "web_push",
    deviceId: `device_${id}`,
    token: JSON.stringify({ endpoint, keys: { p256dh: "key", auth: "auth" } }),
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const payload: NotificationProviderPayload = {
  notificationId: "notification_1",
  locale: "ar",
  title: "ASOL",
  body: "Body",
  category: "system",
  priority: "normal",
  sound: "default",
  dedupeKey: "system.info:test",
};

async function main() {
  const { WebPushNotificationProvider } = await import(
    "../services/providers/web-push-notification-provider.server"
  );
  const { WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_VAPID_SUBJECT } = await import(
    "../domain/web-push-config"
  );
  const provider = new WebPushNotificationProvider(() => ({
    privateKey: "private",
  }));

  const delivered = await provider.send({
    tokens: [token("ntok_live", "https://push.example/live")],
    payload,
  });
  assert.equal(delivered.status, "queued");
  assert.deepEqual(delivered.invalidTokenIds, []);

  // 410 Gone means the browser dropped the subscription: the registration is
  // dead and must be cleaned up.
  nextRejection = () => Object.assign(new Error("Gone"), { statusCode: 410 });
  const expired = await provider.send({
    tokens: [token("ntok_expired", "https://push.example/expired")],
    payload,
  });
  assert.equal(expired.status, "failed");
  assert.deepEqual(expired.invalidTokenIds, ["ntok_expired"]);

  // A transient server error must never cost the user their subscription.
  nextRejection = () =>
    Object.assign(new Error("Service Unavailable"), { statusCode: 503 });
  const transient = await provider.send({
    tokens: [token("ntok_flaky", "https://push.example/flaky")],
    payload,
  });
  assert.equal(transient.status, "failed");
  assert.deepEqual(transient.invalidTokenIds, []);

  nextRejection = null;
  assert.equal(sent.length, 3);

  // The pair handed to the transport is the constant plus the configured
  // secret. A public key that does not match what the browser subscribed with
  // is rejected by the push service, so it is asserted rather than assumed.
  assert.deepEqual(vapidDetails[0], [
    WEB_PUSH_VAPID_SUBJECT,
    WEB_PUSH_VAPID_PUBLIC_KEY,
    "private",
  ]);
  assert.match(
    WEB_PUSH_VAPID_SUBJECT,
    /^mailto:.+@.+\..+$/,
    "RFC 8292 requires a contact a push service can actually reach.",
  );
  assert.equal(
    WEB_PUSH_VAPID_PUBLIC_KEY.length,
    87,
    "An uncompressed P-256 public key is 87 base64url characters.",
  );
  assert.match(WEB_PUSH_VAPID_PUBLIC_KEY, /^[A-Za-z0-9_-]+$/);

  // Without the secret the transport must report a named failure and keep the
  // tokens: the subscriptions are healthy, the server is not configured.
  const unconfigured = await new WebPushNotificationProvider(() => null).send({
    tokens: [token("ntok_unconfigured", "https://push.example/unconfigured")],
    payload,
  });
  assert.equal(unconfigured.status, "failed");
  assert.match(unconfigured.message ?? "", /webPushNotConfigured/);
  assert.deepEqual(unconfigured.invalidTokenIds ?? [], []);
  assert.equal(sent.length, 3, "An unconfigured provider must not send.");

  console.log("Web push provider tests passed.");
}

void main();
