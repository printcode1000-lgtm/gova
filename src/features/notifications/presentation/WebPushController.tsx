"use client";

import { useEffect } from "react";
import { LOCALE_CHANGED_EVENT } from "@/lib/i18n";
import { useSession } from "@/features/auth/components/SessionProvider";
import { NOTIFICATION_CHANGED_EVENT } from "../domain/defaults";
import { notificationDeviceTokenService } from "../application/device-token-service";

/**
 * Browser-side notification wiring.
 *
 * Forwards service-worker messages into window events, and re-registers the
 * device token when the UI language changes. The language part runs on every
 * platform and listens for the document-locale event rather than reading the
 * preferences context, so it stays independent of where it is mounted.
 *
 * This controller never prompts. The post-login opt-in dialog is shared by
 * every platform and lives in `NotificationOptInController`; `/settings` keeps
 * its manual toggle for turning the browser subscription on and off later.
 */
export function WebPushController() {
  const { session } = useSession();
  const uid = session?.uid ?? "";
  const phone = session?.phone ?? "";

  useEffect(() => {
    if (!uid || typeof window === "undefined") return;
    const handleLocaleChange = () => {
      void notificationDeviceTokenService
        .refreshLocale(uid, phone)
        .catch((error) => {
          // Not fatal: push keeps working, the text just stays in the previous
          // language until the next registration.
          console.warn(
            "[Notifications] Failed to update the device language.",
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
