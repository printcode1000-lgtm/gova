"use client";

import type { NotificationEntity } from "@asol/notifications-core";

export const ORDER_DATA_REFRESH_EVENT = "asol:orders:data-refresh";

export function resolveOrderIdFromNotification(
  notification: Pick<NotificationEntity, "metadata" | "route" | "category" | "groupKey">,
): string | null {
  const metaOrderId = notification.metadata?.orderId;
  if (typeof metaOrderId === "string" && metaOrderId.trim()) {
    return metaOrderId.trim();
  }
  const href = notification.route?.href ?? "";
  const match = href.match(/[?&]orderId=([^&]+)/);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return null;
}

export function notifyOrderDataRefresh(orderId: string, uid?: string) {
  if (typeof window === "undefined" || !orderId) return;
  window.dispatchEvent(
    new CustomEvent(ORDER_DATA_REFRESH_EVENT, {
      detail: { orderId, uid },
    }),
  );
}

export function notifyOrderDataRefreshFromNotification(
  notification: NotificationEntity,
) {
  const orderId = resolveOrderIdFromNotification(notification);
  if (orderId) notifyOrderDataRefresh(orderId, notification.uid);
}
