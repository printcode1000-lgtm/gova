import assert from "node:assert/strict";
import Module from "node:module";
import type { RegisteredNotificationToken } from "../domain/entities";
import type { NotificationProviderPayload } from "../services/providers/notification-provider.interface";

/**
 * `web-push` opens no connection here: the transport is replaced before the
 * provider module is loaded, so the test exercises the result mapping only.
 */
const sent: string[] = [];
let nextRejection: (() => unknown) | null = null;

const originalRequire = Module.prototype.require;
Module.prototype.require = function patchedRequire(this: unknown, id: string) {
  if (id === "web-push") {
    return {
      setVapidDetails: () => undefined,
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

const vapidService = {
  getPrivateForProvider: async () => ({
    subject: "mailto:admin@asol.local",
    publicKey: "public",
    privateKey: "private",
  }),
};

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
  const provider = new WebPushNotificationProvider(
    vapidService as unknown as ConstructorParameters<
      typeof WebPushNotificationProvider
    >[0],
  );

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

  console.log("Web push provider tests passed.");
}

void main();
