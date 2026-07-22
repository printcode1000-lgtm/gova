"use client";

import * as React from "react";
import { useSession } from "@/features/auth/components/SessionProvider";
import { NOTIFICATION_CHANGED_EVENT } from "../../domain/defaults";
import type { NotificationEntity } from "../../domain/entities";
import { NotificationTargets } from "../../domain/enums";
import { asolNotificationRepository } from "../../infrastructure/asol-notification-repository";
import { notificationLifecycleService } from "../../application/notification-lifecycle-service";
import { notificationBadgeService } from "../../application/badge-service";
import { notificationPermissionService } from "../../application/permission-service";
import { notificationSyncService } from "../../application/notification-sync-service";
import { notificationDeviceTokenService } from "../../application/device-token-service";
import { SPECIALTY_CHAT_KINDS, specialtyChatClient } from "@/features/specialty-chat";

const receiptInFlight = new Set<string>();

export function useNotifications() {
  const { session, isLoading } = useSession();
  const uid = session?.uid ?? "";
  const [notifications, setNotifications] = React.useState<
    NotificationEntity[]
  >([]);
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
    let items = await asolNotificationRepository.list(uid);
    const receipts = items.filter(
      (item) => item.metadata?.specialtyChatKind === SPECIALTY_CHAT_KINDS.Receipt,
    );
    if (receipts.length > 0) {
      for (const receipt of receipts) {
        const target = String(receipt.metadata?.targetMessageId ?? "");
        const status = receipt.metadata?.receiptStatus;
        if (target && (status === "received" || status === "read")) {
          await asolNotificationRepository.applyMessageReceipt(
            uid,
            target,
            status,
            String(receipt.metadata?.receiptFromUid ?? ""),
          );
        }
        await asolNotificationRepository.delete(uid, receipt.id);
      }
      items = await asolNotificationRepository.list(uid);
    }
    const badgeCount = items.filter(
      (item) => !item.readAt && item.targets.includes(NotificationTargets.Badge),
    ).length;
    setNotifications(items);
    setUnreadCount(badgeCount);
    await notificationBadgeService.refresh(uid);
    setLoading(false);
    if (session) {
      for (const item of items) {
        const kind = item.metadata?.specialtyChatKind;
        const capability = String(item.metadata?.capability ?? "");
        const targetMessageId = String(
          kind === SPECIALTY_CHAT_KINDS.Request
            ? item.metadata?.requestId ?? ""
            : item.metadata?.messageId ?? "",
        );
        if (
          item.metadata?.outgoing !== true &&
          item.metadata?.receivedReceiptSent !== true &&
          capability &&
          targetMessageId &&
          (kind === SPECIALTY_CHAT_KINDS.Request || kind === SPECIALTY_CHAT_KINDS.Message)
        ) {
          const receiptKey = `${uid}:${item.id}:received`;
          if (!receiptInFlight.has(receiptKey)) {
            receiptInFlight.add(receiptKey);
            void specialtyChatClient
              .receipt(session, { capability, targetMessageId, status: "received" })
              .then(() =>
                asolNotificationRepository.update(uid, item.id, {
                  metadata: { ...item.metadata, receivedReceiptSent: true },
                }),
              )
              .catch(() => undefined)
              .finally(() => receiptInFlight.delete(receiptKey));
          }
        }
      }
    }
  }, [session, uid]);

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
        await notificationDeviceTokenService.register(
          uid,
          session?.phone ?? "",
        );
      }
      return permission;
    },
    markRead: async (notificationId: string) => {
      if (!uid) return;
      const item = notifications.find((candidate) => candidate.id === notificationId);
      await notificationLifecycleService.markRead(uid, notificationId);
      const kind = item?.metadata?.specialtyChatKind;
      const capability = String(item?.metadata?.capability ?? "");
      const targetMessageId = String(
        kind === SPECIALTY_CHAT_KINDS.Request
          ? item?.metadata?.requestId ?? ""
          : item?.metadata?.messageId ?? "",
      );
      if (
        session && capability && targetMessageId && item?.metadata?.outgoing !== true &&
        (kind === SPECIALTY_CHAT_KINDS.Request || kind === SPECIALTY_CHAT_KINDS.Message)
      ) {
        void specialtyChatClient.receipt(session, { capability, targetMessageId, status: "read" });
      }
      await refresh();
    },
    markAllRead: async () => {
      if (!uid) return;
      await notificationLifecycleService.markAllRead(uid);
      if (session) {
        for (const item of notifications.filter((candidate) => !candidate.readAt)) {
          const kind = item.metadata?.specialtyChatKind;
          const capability = String(item.metadata?.capability ?? "");
          const targetMessageId = String(
            kind === SPECIALTY_CHAT_KINDS.Request
              ? item.metadata?.requestId ?? ""
              : item.metadata?.messageId ?? "",
          );
          if (
            capability && targetMessageId && item.metadata?.outgoing !== true &&
            (kind === SPECIALTY_CHAT_KINDS.Request || kind === SPECIALTY_CHAT_KINDS.Message)
          ) {
            void specialtyChatClient.receipt(session, { capability, targetMessageId, status: "read" });
          }
        }
      }
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
