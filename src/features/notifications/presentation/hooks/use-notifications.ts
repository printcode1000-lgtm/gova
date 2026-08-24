"use client";

import * as React from "react";
import { NOTIFICATION_CHANGED_EVENT } from "@asol/notifications-core";
import type { NotificationEntity } from "@asol/notifications-core";
import { notificationsFacade } from "../../public/notification-facade";
import { useNotificationRuntime } from "../NotificationRuntimeProvider";

export function useNotifications() {
  const { identity: session, isLoading } = useNotificationRuntime();
  const uid = session?.uid ?? "";
  const [notifications, setNotifications] = React.useState<NotificationEntity[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (!uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const snapshot = await notificationsFacade.synchronizeNotificationCenter({ uid });
    setNotifications(snapshot.notifications);
    setUnreadCount(snapshot.unreadCount);
    setLoading(false);
  }, [uid]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (!uid || typeof window === "undefined") return;
    const handleChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ uid: string }>).detail;
      if (!detail?.uid || detail.uid === uid) void refresh();
    };
    window.addEventListener(NOTIFICATION_CHANGED_EVENT, handleChanged);
    window.addEventListener("online", handleChanged);
    return () => {
      window.removeEventListener(NOTIFICATION_CHANGED_EVENT, handleChanged);
      window.removeEventListener("online", handleChanged);
    };
  }, [refresh, uid]);

  return {
    isLoading: isLoading || loading,
    uid,
    notifications,
    unreadCount,
    refresh,
    requestPermission: () =>
      notificationsFacade.requestPermission({ uid, phone: session?.phone ?? "" }),
    markRead: async (notificationId: string) => {
      if (!uid) return;
      await notificationsFacade.markRead({ uid, notificationId });
      await refresh();
    },
    markManyRead: async (notificationIds: readonly string[]) => {
      if (!uid) return;
      await notificationsFacade.markManyRead({ uid, notificationIds });
      await refresh();
    },
    markAllRead: async () => {
      if (!uid) return;
      await notificationsFacade.markAllRead({ uid });
      await refresh();
    },
    dismiss: async (notificationId: string) => {
      if (!uid) return;
      await notificationsFacade.dismiss({ uid, notificationId });
      await refresh();
    },
  };
}

export function useNotificationBadge() {
  const { unreadCount } = useNotifications();
  return unreadCount;
}
