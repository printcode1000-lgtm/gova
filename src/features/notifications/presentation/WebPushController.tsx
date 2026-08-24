"use client";

import { useEffect } from "react";
import { LOCALE_CHANGED_EVENT } from "@/shared/i18n";
import { NOTIFICATION_CHANGED_EVENT } from "@asol/notifications-core";
import { notificationDeviceTokenService } from "../application/device-token-service";
import { notificationLog } from "../domain/notification-redaction";
import { useNotificationRuntime } from "./NotificationRuntimeProvider";

export function WebPushController() {
  const { identity: session } = useNotificationRuntime();
  const uid = session?.uid ?? "";
  const phone = session?.phone ?? "";

  useEffect(() => {
    if (!uid || typeof window === "undefined") return;
    void notificationDeviceTokenService
      .refreshLocale(uid, phone)
      .catch((error) => {
        notificationLog.warn(
          "Failed to attach the existing Web Push subscription.",
          error,
        );
      });

    const handleLocaleChange = () => {
      void notificationDeviceTokenService
        .refreshLocale(uid, phone)
        .catch((error) => {
          notificationLog.warn(
            "Failed to update the device language.",
            error,
          );
        });
    };
    window.addEventListener(LOCALE_CHANGED_EVENT, handleLocaleChange);
    return () =>
      window.removeEventListener(LOCALE_CHANGED_EVENT, handleLocaleChange);
  }, [phone, uid]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const data = event.data as
        | { type?: string; uid?: string; notificationId?: string }
        | undefined;
      if (data?.type !== NOTIFICATION_CHANGED_EVENT) return;
      window.dispatchEvent(
        new CustomEvent(NOTIFICATION_CHANGED_EVENT, {
          detail: { uid: data.uid, notificationId: data.notificationId },
        }),
      );
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}
