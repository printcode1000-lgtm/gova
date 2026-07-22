import assert from "node:assert/strict";
import { FcmNotificationProvider } from "../services/providers/fcm-notification-provider.server";
import { NoopNotificationProvider } from "../services/providers/noop-notification-provider.server";
import type { RegisteredNotificationToken } from "../domain/entities";
import { NotificationPlatforms } from "../domain/enums";
import type { FcmHttpV1Message } from "../services/providers/fcm-http-v1.server";

const token: RegisteredNotificationToken = {
  id: "ntok_1",
  uid: "usr_1",
  platform: NotificationPlatforms.Android,
  provider: "fcm",
  deviceId: "browser_1",
  token: "token_1",
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function main() {
  let sentMessage: FcmHttpV1Message | null = null;
  const provider = new FcmNotificationProvider(() => ({
    send: async (message) => {
      sentMessage = message;
      return { success: true, messageId: "projects/asole/messages/1" };
    },
  }));

  const result = await provider.send({
    tokens: [token],
    payload: {
      locale: "ar",
      notificationId: "notification_1",
      templateId: "system.info",
      dedupeKey: "system.info:test",
      category: "system",
      priority: "normal",
      sound: "default",
      variables: { message: "Hello" },
    },
  });

  assert.equal(result.provider, "fcm");
  assert.equal(result.status, "sent");
  assert.equal(result.tokenCount, 1);
  assert.equal(sentMessage?.message.android.restricted_package_name, "hgh.asol.app");
  assert.equal(sentMessage?.message.android.notification.channel_id, "asol_general_v2");
  assert.equal(sentMessage?.message.android.notification.sound, "custom_notification");
  assert.equal(sentMessage?.message.data.dedupeKey, "system.info:test");
  assert.equal(sentMessage?.message.data.uid, "usr_1");

  let receiptMessage: FcmHttpV1Message | null = null;
  const receiptProvider = new FcmNotificationProvider(() => ({
    send: async (message) => {
      receiptMessage = message;
      return { success: true, messageId: "projects/asole/messages/receipt" };
    },
  }));
  await receiptProvider.send({
    tokens: [token],
    payload: {
      locale: "ar",
      notificationId: "notification_receipt",
      dedupeKey: "receipt:msg_12345678:received:usr_1",
      title: "Receipt",
      body: "received",
      category: "chat",
      priority: "normal",
      sound: "silent",
      metadata: {
        dataOnly: true,
        specialtyChatKind: "specialty_receipt",
        targetMessageId: "msg_12345678",
      },
    },
  });
  assert.equal(receiptMessage?.message.notification, undefined);
  assert.equal(receiptMessage?.message.android.notification, undefined);
  assert.equal(receiptMessage?.message.android.ttl, "604800s");
  assert.equal(receiptMessage?.message.data.meta_specialtyChatKind, "specialty_receipt");

  const invalidProvider = new FcmNotificationProvider(() => ({
    send: async () => ({ success: false, errorCode: "UNREGISTERED" }),
  }));
  const invalidResult = await invalidProvider.send({
    tokens: [token],
    payload: {
      locale: "ar",
      notificationId: "notification_invalid",
      dedupeKey: "system.info:invalid",
      title: "Test",
      body: "Body",
      category: "system",
      priority: "normal",
      sound: "default",
    },
  });
  assert.equal(invalidResult.status, "failed");
  assert.deepEqual(invalidResult.invalidTokenIds, [token.id]);

  const fallback = await new NoopNotificationProvider().send({
    tokens: [token],
    payload: {
      locale: "ar",
      notificationId: "notification_2",
      dedupeKey: "noop:test",
      title: "Test",
      body: "Body",
      category: "system",
      priority: "normal",
      sound: "default",
    },
  });
  assert.equal(fallback.provider, "noop");
  assert.equal(fallback.status, "queued");

  console.log("Notification provider registry tests passed.");
}

void main();
