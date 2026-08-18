"use client";

import { useEffect } from "react";
import { NOTIFICATION_CHANGED_EVENT } from "@asol/notifications-core";
import { useSession } from "@/features/auth/components/SessionProvider";
import { notifications } from "@/features/notifications";
import {
  notifyOrderDataRefreshFromNotification,
  ORDER_DATA_REFRESH_EVENT,
} from "@/lib/order-data-refresh";

/**
 * Turns order-related notifications into live order reload signals for open pages.
 */
export function OrderNotificationsController() {
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (isLoading || !session?.uid || typeof window === "undefined") return;

    const handleNotificationChanged = async (event: Event) => {
      const detail = (
        event as CustomEvent<{ uid?: string; notificationId?: string }>
      ).detail;
      if (!detail?.uid || detail.uid !== session.uid) return;
      if (!detail.notificationId) return;
      const snapshot = await notifications.synchronizeNotificationCenter({
        uid: session.uid,
      });
      const notification = snapshot.notifications.find(
        (entry) => entry.id === detail.notificationId,
      );
      if (notification) notifyOrderDataRefreshFromNotification(notification);
    };

    window.addEventListener(
      NOTIFICATION_CHANGED_EVENT,
      handleNotificationChanged,
    );
    return () => {
      window.removeEventListener(
        NOTIFICATION_CHANGED_EVENT,
        handleNotificationChanged,
      );
    };
  }, [isLoading, session?.uid]);

  return null;
}

export function useOrdersListAutoRefresh(
  reload: () => void | Promise<void>,
  uid?: string,
) {
  useEffect(() => {
    if (!uid || typeof window === "undefined") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ orderId?: string; uid?: string }>)
        .detail;
      if (detail?.uid && detail.uid !== uid) return;
      if (!detail?.orderId) return;
      void reload();
    };
    window.addEventListener(ORDER_DATA_REFRESH_EVENT, handler);
    return () => window.removeEventListener(ORDER_DATA_REFRESH_EVENT, handler);
  }, [reload, uid]);
}

export function useOrderDetailsAutoRefresh(
  orderId: string,
  reload: () => void | Promise<void>,
  uid?: string,
) {
  useEffect(() => {
    if (!uid || typeof window === "undefined") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ orderId?: string; uid?: string }>)
        .detail;
      if (detail?.uid && detail.uid !== uid) return;
      if (detail?.orderId === orderId) void reload();
    };
    window.addEventListener(ORDER_DATA_REFRESH_EVENT, handler);
    return () => window.removeEventListener(ORDER_DATA_REFRESH_EVENT, handler);
  }, [orderId, reload, uid]);
}
