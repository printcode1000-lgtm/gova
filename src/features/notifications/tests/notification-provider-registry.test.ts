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
  assert.equal(sentMessage?.message.android.notification.channel_id, "asol_general_v3");
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

  // -------------------------------------------------------------------------
  // Apple delivery through Firebase Cloud Messaging
  // -------------------------------------------------------------------------
  // FCM ignores the `android` block for Apple tokens, so the `apns` block is
  // the only place iOS sound, priority, and grouping can be expressed.
  assert.ok(sentMessage, "No FCM message was captured.");
  const apple = (sentMessage as FcmHttpV1Message).message.apns;
  assert.ok(apple, "The FCM message carried no apns block.");
  assert.equal(apple?.payload.aps.alert?.title, "ASOL");
  assert.equal(apple?.payload.aps.sound, "custom_notification.caf");
  assert.equal(apple?.headers?.["apns-push-type"], "alert");
  // A normal-priority alert must not claim immediate delivery.
  assert.equal(apple?.headers?.["apns-priority"], "5");

  let highPriorityMessage: FcmHttpV1Message | null = null;
  await new FcmNotificationProvider(() => ({
    send: async (message) => {
      highPriorityMessage = message;
      return { success: true };
    },
  })).send({
    tokens: [token],
    payload: {
      locale: "ar",
      notificationId: "notification_urgent",
      dedupeKey: "system.urgent:1",
      title: "Urgent",
      body: "Now",
      category: "system",
      priority: "critical",
      sound: "default",
    },
  });
  const urgent = (highPriorityMessage as unknown as FcmHttpV1Message).message.apns;
  assert.equal(urgent?.headers?.["apns-priority"], "10");
  assert.equal(urgent?.payload.aps["interruption-level"], "time-sensitive");

  // A data-only push must be a silent background delivery on Apple.
  const silent = (receiptMessage as unknown as FcmHttpV1Message).message.apns;
  assert.equal(silent?.headers?.["apns-push-type"], "background");
  assert.equal(silent?.headers?.["apns-priority"], "5");
  assert.equal(silent?.payload.aps["content-available"], 1);
  assert.equal(silent?.payload.aps.alert, undefined);

  // -------------------------------------------------------------------------
  // The template's `sound` decides the delivery, not just the stored card
  // -------------------------------------------------------------------------
  // `silent` used to be carried in the payload and then ignored by both
  // transports, so a notification declared silent still rang the phone.
  let silentAlert: FcmHttpV1Message | null = null;
  await new FcmNotificationProvider(() => ({
    send: async (message) => {
      silentAlert = message;
      return { success: true };
    },
  })).send({
    tokens: [token],
    payload: {
      locale: "ar",
      notificationId: "notification_silent",
      dedupeKey: "system.info:silent",
      title: "Notice",
      body: "Quiet",
      category: "system",
      priority: "low",
      sound: "silent",
    },
  });
  const silentMessage = silentAlert as unknown as FcmHttpV1Message;
  // Android plays a channel's sound, so silence needs its own low-importance
  // channel — omitting the payload field is not enough on Android 8+.
  assert.equal(
    silentMessage.message.android.notification?.channel_id,
    "asol_silent_v3",
  );
  assert.equal(silentMessage.message.android.notification?.sound, undefined);
  // On Apple, no `sound` key is the silent banner.
  assert.equal(silentMessage.message.apns?.payload.aps.sound, undefined);
  assert.equal(
    silentMessage.message.apns?.payload.aps["interruption-level"],
    "passive",
  );
  // It is still a visible notification, unlike the data-only receipt above.
  assert.ok(silentMessage.message.notification);

  // `urgent` cannot mean a different file — there is one sound asset — so it
  // means the channel that interrupts.
  let urgentSound: FcmHttpV1Message | null = null;
  await new FcmNotificationProvider(() => ({
    send: async (message) => {
      urgentSound = message;
      return { success: true };
    },
  })).send({
    tokens: [token],
    payload: {
      locale: "ar",
      notificationId: "notification_seller_rejected",
      dedupeKey: "order.sellerRejected:ord_1",
      title: "Rejected",
      body: "Seller rejected the order",
      category: "orders",
      priority: "high",
      sound: "urgent",
    },
  });
  const urgentMessage = urgentSound as unknown as FcmHttpV1Message;
  assert.equal(
    urgentMessage.message.android.notification?.channel_id,
    "asol_urgent_v3",
  );
  assert.equal(
    urgentMessage.message.android.notification?.sound,
    "custom_notification",
  );
  assert.equal(
    urgentMessage.message.apns?.payload.aps.sound,
    "custom_notification.caf",
  );

  // A super-admin announcement keeps its own channel so it can be silenced
  // from Android settings without silencing orders.
  let broadcastMessage: FcmHttpV1Message | null = null;
  await new FcmNotificationProvider(() => ({
    send: async (message) => {
      broadcastMessage = message;
      return { success: true };
    },
  })).send({
    tokens: [token],
    payload: {
      locale: "ar",
      notificationId: "notification_broadcast",
      dedupeKey: "broadcast:abc",
      title: "Announcement",
      body: "Body",
      category: "system",
      priority: "normal",
      sound: "default",
      metadata: { source: "super_admin_broadcast" },
    },
  });
  assert.equal(
    (broadcastMessage as unknown as FcmHttpV1Message).message.android.notification
      ?.channel_id,
    "asol_updates_v3",
  );
  assert.equal(
    (broadcastMessage as unknown as FcmHttpV1Message).message.android.notification
      ?.sound,
    "custom_notification",
  );

  // -------------------------------------------------------------------------
  // Missing Firebase Admin credentials
  // -------------------------------------------------------------------------
  const unconfigured = await new FcmNotificationProvider(() => {
    throw new Error("no service account");
  }).send({
    tokens: [token],
    payload: {
      locale: "ar",
      notificationId: "notification_unconfigured",
      dedupeKey: "system.info:unconfigured",
      title: "Test",
      body: "Body",
      category: "system",
      priority: "normal",
      sound: "default",
    },
  });
  assert.equal(unconfigured.status, "failed");
  assert.match(unconfigured.message ?? "", /firebaseAdminNotConfigured/);
  // A server misconfiguration must never de-register a healthy device.
  assert.deepEqual(unconfigured.invalidTokenIds ?? [], []);

  console.log("Notification provider registry tests passed.");
}

void main();
