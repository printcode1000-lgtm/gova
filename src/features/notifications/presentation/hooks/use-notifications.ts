"use client";

import * as React from "react";
import { useSession } from "@/features/auth/components/SessionProvider";
import { NOTIFICATION_CHANGED_EVENT } from "../../domain/defaults";
import type { NotificationEntity } from "../../domain/entities";
import { asolNotificationRepository } from "../../infrastructure/asol-notification-repository";
import { notificationLifecycleService } from "../../application/notification-lifecycle-service";
import { notificationBadgeService } from "../../application/badge-service";
import { notificationPermissionService } from "../../application/permission-service";
import { notificationSyncService } from "../../application/notification-sync-service";
import { notificationDeviceTokenService } from "../../application/device-token-service";

export function useNotifications() {
  const { session, isLoading } = useSession();
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
    const items = await asolNotificationRepository.list(uid);
    setNotifications(items);
    setUnreadCount(items.filter((item) => !item.readAt).length);
    await notificationBadgeService.refresh(uid);
    setLoading(false);
  }, [uid]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (!uid || typeof window === "undefined") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ uid: string }>).detail;
      if (!detail?.uid || detail.uid === uid) void refresh();
    };
    window.addEventListener(NOTIFICATION_CHANGED_EVENT, handler);
    window.addEventListener("online", handler);
    return () => {
      window.removeEventListener(NOTIFICATION_CHANGED_EVENT, handler);
      window.removeEventListener("online", handler);
    };
  }, [refresh, uid]);

  React.useEffect(() => {
    if (uid) void notificationSyncService.sync(uid);
  }, [uid]);

  return {
    isLoading: isLoading || loading,
    uid,
    notifications,
    unreadCount,
    refresh,
    requestPermission: async () => {
      const permission = await notificationPermissionService.request();
      if (uid && (permission === "granted" || permission === "unsupported")) {
        await notificationDeviceTokenService.register(uid);
      }
      return permission;
    },
    markRead: async (notificationId: string) => {
      if (!uid) return;
      await notificationLifecycleService.markRead(uid, notificationId);
      await refresh();
    },
    markAllRead: async () => {
      if (!uid) return;
      await notificationLifecycleService.markAllRead(uid);
      await refresh();
    },
    dismiss: async (notificationId: string) => {
      if (!uid) return;
      await notificationLifecycleService.dismiss(uid, notificationId);
      await refresh();
    },
  };
}

export function useNotificationBadge() {
  const { unreadCount } = useNotifications();
  return unreadCount;
}
