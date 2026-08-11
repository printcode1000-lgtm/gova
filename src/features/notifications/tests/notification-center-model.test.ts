import assert from "node:assert/strict";
import type { NotificationEntity } from "../domain/entities";
import {
  NotificationCategories,
  NotificationChannels,
  NotificationContentSources,
  NotificationDeliveryStatuses,
  NotificationPriorities,
  NotificationSounds,
  NotificationSyncStates,
  NotificationTargets,
  NotificationTypes,
} from "../domain/enums";
import { SPECIALTY_CHAT_KINDS } from "@/features/specialty-chat/domain/types";
import {
  buildActivityGroups,
  buildLocalChatConversations,
  conversationMessages,
} from "../presentation/notification-center-model";

function notification(
  id: string,
  category: NotificationEntity["category"],
  createdAt: string,
  metadata: NotificationEntity["metadata"] = {},
  groupKey?: string,
): NotificationEntity {
  return {
    id,
    uid: "current-user",
    type: NotificationTypes.Custom,
    source: NotificationContentSources.Custom,
    title: id,
    body: `body:${id}`,
    category,
    priority: NotificationPriorities.Normal,
    channels: [NotificationChannels.InApp],
    targets: [NotificationTargets.Center],
    ...(groupKey ? { groupKey } : {}),
    dedupeKey: id,
    sound: NotificationSounds.Silent,
    status: NotificationDeliveryStatuses.Delivered,
    syncState: NotificationSyncStates.Synced,
    createdAt,
    updatedAt: createdAt,
    metadata,
  };
}

const request = notification(
  "req_12345678",
  NotificationCategories.Chat,
  "2026-08-11T10:00:00.000Z",
  {
    specialtyChatKind: SPECIALTY_CHAT_KINDS.Request,
    requestId: "req_12345678",
    outgoing: true,
    subcategoryName: "ملابس نسائية",
  },
  "req_12345678",
);
const providerOneReply = notification(
  "msg_provider_one",
  NotificationCategories.Chat,
  "2026-08-11T10:02:00.000Z",
  {
    specialtyChatKind: SPECIALTY_CHAT_KINDS.Message,
    requestId: "req_12345678",
    messageId: "msg_provider_one",
    peerUid: "provider-1",
    senderUid: "provider-1",
    capability: "capability-1",
  },
  "req_12345678",
);
const buyerReply = notification(
  "msg_buyer_reply",
  NotificationCategories.Chat,
  "2026-08-11T10:03:00.000Z",
  {
    specialtyChatKind: SPECIALTY_CHAT_KINDS.Message,
    requestId: "req_12345678",
    messageId: "msg_buyer_reply",
    peerUid: "provider-1",
    capability: "capability-1",
    outgoing: true,
  },
  "req_12345678",
);
const providerTwoReply = notification(
  "msg_provider_two",
  NotificationCategories.Chat,
  "2026-08-11T10:04:00.000Z",
  {
    specialtyChatKind: SPECIALTY_CHAT_KINDS.Message,
    requestId: "req_12345678",
    messageId: "msg_provider_two",
    peerUid: "provider-2",
    senderUid: "provider-2",
    capability: "capability-2",
  },
  "req_12345678",
);
const legacyChat = notification(
  "legacy-chat",
  NotificationCategories.Chat,
  "2026-08-11T09:00:00.000Z",
);
const orderCreated = notification(
  "order-created",
  NotificationCategories.Orders,
  "2026-08-11T08:00:00.000Z",
  { orderId: "order-1" },
);
const orderUpdated = notification(
  "order-updated",
  NotificationCategories.Orders,
  "2026-08-11T11:00:00.000Z",
  { orderId: "order-1" },
);
const systemOne = notification(
  "system-one",
  NotificationCategories.System,
  "2026-08-11T07:00:00.000Z",
);
const systemTwo = notification(
  "system-two",
  NotificationCategories.System,
  "2026-08-11T07:01:00.000Z",
);

const source = [
  request,
  providerOneReply,
  buyerReply,
  providerTwoReply,
  legacyChat,
  orderCreated,
  orderUpdated,
  systemOne,
  systemTwo,
];

const activityGroups = buildActivityGroups(source);
const groupedIds = activityGroups.flatMap((group) => group.items.map((item) => item.id));
assert.deepEqual(
  [...groupedIds].sort(),
  source.map((item) => item.id).sort(),
  "every stored notification must remain in exactly one activity group",
);
assert.equal(new Set(groupedIds).size, source.length, "grouping must not duplicate stored items");

const orderGroup = activityGroups.find((group) => group.key === "orders:order-1");
assert.deepEqual(
  orderGroup?.items.map((item) => item.id),
  ["order-updated", "order-created"],
  "business histories must be newest-first",
);
assert.notEqual(
  activityGroups.find((group) => group.items.some((item) => item.id === "system-one"))?.key,
  activityGroups.find((group) => group.items.some((item) => item.id === "system-two"))?.key,
  "unkeyed system notices must never be merged merely because their category matches",
);

const conversations = buildLocalChatConversations(source);
const directConversationIds = conversations.flatMap((group) =>
  group.items.map((item) => item.id),
);
assert.deepEqual(
  [...directConversationIds].sort(),
  [request, providerOneReply, buyerReply, providerTwoReply, legacyChat]
    .map((item) => item.id)
    .sort(),
  "chat grouping must preserve every locally stored chat item exactly once",
);
const providerOne = conversations.find(
  (item) => item.requestId === "req_12345678" && item.peerUid === "provider-1",
);
const providerTwo = conversations.find(
  (item) => item.requestId === "req_12345678" && item.peerUid === "provider-2",
);
assert.ok(providerOne, "provider one conversation must exist");
assert.ok(providerTwo, "provider two conversation must exist separately");
assert.notEqual(providerOne.key, providerTwo.key, "different providers must never share a thread");
assert.equal(providerOne.contextItem?.id, request.id, "the original request should be visible as thread context");
assert.deepEqual(
  conversationMessages(providerOne).map((item) => item.id),
  [request.id, providerOneReply.id, buyerReply.id],
  "messages inside a thread must be oldest-first with the original request included once",
);

console.log("Notification center grouping, preservation, and chat ordering contract passed.");
