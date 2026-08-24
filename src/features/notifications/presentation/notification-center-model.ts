import type { NotificationEntity } from "@asol/notifications-core";
import {
  NotificationCategories,
  type NotificationCategory,
} from "@asol/notifications-core";

export interface NotificationActivityGroup {
  key: string;
  category: NotificationCategory;
  items: NotificationEntity[];
  latest: NotificationEntity;
  unreadCount: number;
}

export type ChatConversationKind = "conversation" | "broadcast";

export interface LocalChatConversation extends NotificationActivityGroup {
  kind: ChatConversationKind;
  requestId: string;
  peerUid: string;
  contextItem?: NotificationEntity;
}

function metadataText(notification: NotificationEntity, ...keys: string[]): string {
  for (const key of keys) {
    const value = notification.metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function timeValue(notification: NotificationEntity): number {
  const value = Date.parse(notification.createdAt);
  return Number.isFinite(value) ? value : 0;
}

export function sortNewestFirst(items: readonly NotificationEntity[]): NotificationEntity[] {
  return [...items].sort((left, right) => timeValue(right) - timeValue(left));
}

export function sortOldestFirst(items: readonly NotificationEntity[]): NotificationEntity[] {
  return [...items].sort((left, right) => timeValue(left) - timeValue(right));
}

function explicitBusinessKey(notification: NotificationEntity): string {
  if (notification.groupKey?.trim()) return notification.groupKey.trim();
  if (notification.category === NotificationCategories.Orders) {
    return metadataText(notification, "orderId", "shipmentId", "returnRequestId");
  }
  if (notification.category === NotificationCategories.Offers) {
    return metadataText(notification, "offerId", "quoteId", "deliveryPlanId", "orderId", "requestId");
  }
  if (notification.category === NotificationCategories.Payment) {
    return metadataText(notification, "paymentId", "transactionId", "orderId");
  }
  if (notification.category === NotificationCategories.System) {
    return metadataText(notification, "announcementId", "releaseId", "campaignId");
  }
  return "";
}

function activityKey(notification: NotificationEntity): string {
  if (notification.category === NotificationCategories.Chat) return chatKey(notification);
  const businessKey = explicitBusinessKey(notification);
  return businessKey
    ? `${notification.category}:${businessKey}`
    : `${notification.category}:notification:${notification.id}`;
}

function toActivityGroup(key: string, items: NotificationEntity[]): NotificationActivityGroup {
  const sorted = sortNewestFirst(items);
  return {
    key,
    category: sorted[0].category,
    items: sorted,
    latest: sorted[0],
    unreadCount: sorted.filter((item) => !item.readAt).length,
  };
}

export function buildActivityGroups(
  notifications: readonly NotificationEntity[],
): NotificationActivityGroup[] {
  const groups = new Map<string, NotificationEntity[]>();
  for (const notification of notifications) {
    const key = activityKey(notification);
    groups.set(key, [...(groups.get(key) ?? []), notification]);
  }
  return [...groups.entries()]
    .map(([key, items]) => toActivityGroup(key, items))
    .sort((left, right) => timeValue(right.latest) - timeValue(left.latest));
}

function chatIdentity(notification: NotificationEntity): {
  kind: ChatConversationKind;
  requestId: string;
  peerUid: string;
} | null {
  const requestId = metadataText(notification, "requestId");
  const peerUid = metadataText(notification, "peerUid", "senderUid");
  const outgoing = notification.metadata?.outgoing === true;

  if (outgoing && requestId && !peerUid) {
    return { kind: "broadcast", requestId, peerUid: "" };
  }
  if (requestId && peerUid) {
    return { kind: "conversation", requestId, peerUid };
  }
  return null;
}

function chatKey(notification: NotificationEntity): string {
  const identity = chatIdentity(notification);
  if (!identity) return `chat:notification:${notification.id}`;
  if (identity.kind === "broadcast") return `chat:broadcast:${identity.requestId}`;
  return `chat:conversation:${identity.requestId}:${identity.peerUid}`;
}

export function buildLocalChatConversations(
  notifications: readonly NotificationEntity[],
): LocalChatConversation[] {
  const chatItems = notifications.filter(
    (item) => item.category === NotificationCategories.Chat && chatIdentity(item) !== null,
  );
  const outgoingRequests = new Map<string, NotificationEntity>();
  for (const item of chatItems) {
    const identity = chatIdentity(item);
    if (identity?.kind === "broadcast") outgoingRequests.set(identity.requestId, item);
  }

  return buildActivityGroups(chatItems).map((group) => {
    const identity = chatIdentity(group.latest);
    if (!identity) throw new Error("invalidChatNotification");
    const contextItem =
      identity.kind === "conversation" ? outgoingRequests.get(identity.requestId) : undefined;
    return {
      ...group,
      kind: identity.kind,
      requestId: identity.requestId,
      peerUid: identity.peerUid,
      ...(contextItem && !group.items.some((item) => item.id === contextItem.id)
        ? { contextItem }
        : {}),
    };
  });
}

export function conversationMessages(conversation: LocalChatConversation): NotificationEntity[] {
  const source = conversation.contextItem
    ? [conversation.contextItem, ...conversation.items]
    : conversation.items;
  return sortOldestFirst([...new Map(source.map((item) => [item.id, item])).values()]);
}

export function findLocalChatConversation(
  notifications: readonly NotificationEntity[],
  key: string,
): LocalChatConversation | null {
  return buildLocalChatConversations(notifications).find((item) => item.key === key) ?? null;
}
