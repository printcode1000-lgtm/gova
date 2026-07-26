"use client";

import { useEffect } from "react";
import { NOTIFICATION_CHANGED_EVENT } from "../domain/defaults";

export function WebPushController() {
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
