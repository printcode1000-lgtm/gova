import assert from "node:assert/strict";

import { NotificationBuilder } from "@asol/notifications-core/builder";
import {
  NotificationCategories,
  NotificationChannelIds,
  NotificationPriorities,
  NotificationSounds,
  resolveAndroidChannelId,
} from "@asol/notifications-core";
import { buildFcmHttpV1Message } from "../mobile-push/fcm-message";
import { buildMobileProviderPayload } from "../mobile-push/provider-payload";

const send = {
  uids: ["usr_1"],
  dedupeKey: "parity:order.received",
  templateId: "order.received",
  variables: { orderId: "ord_1" },
};
const payload = buildMobileProviderPayload(send, "ar");
const message = buildFcmHttpV1Message(payload, {
  id: "tok_1",
  uid: "usr_1",
  platform: "android",
  provider: "fcm",
  token: "a".repeat(140),
  locale: "ar",
});
assert.equal(
  message.message.data.androidChannelId,
  NotificationChannelIds.Orders,
  "Mobile push FCM data must carry the orders channel for order.received",
);
assert.equal(
  message.message.data.androidChannelId,
  resolveAndroidChannelId({
    category: payload.category as never,
    priority: payload.priority as never,
    sound: payload.sound as never,
    source: payload.metadata?.source,
  }),
  "Mobile push channel must match resolveAndroidChannelId",
);

const builder = new NotificationBuilder();
const built = builder.fromTemplate({
  uid: "parity",
  templateId: "order.received",
  dedupeKey: "parity:order.received",
  locale: "ar",
  variables: { orderId: "ord_1" },
});
assert.equal(
  message.message.data.androidChannelId,
  resolveAndroidChannelId({
    category: built.category,
    priority: built.priority,
    sound: built.sound,
    source: built.metadata?.source,
  }),
  "order.received template channel must match FCM payload",
);

console.log("account-bridge mobile-push-channel-parity.test: ok");
