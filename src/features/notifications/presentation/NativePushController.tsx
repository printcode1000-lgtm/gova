"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/components/SessionProvider";
import { notificationDeviceTokenService } from "../application/device-token-service";
import { notificationLifecycleService } from "../application/notification-lifecycle-service";
import { notificationReceiver } from "../application/notification-receiver";

/**
 * Native push lifecycle for Android and iOS.
 *
 * Mounted once below `SessionProvider`. It attaches the received/tapped
 * handlers, imports notifications still sitting in the system tray, and
 * re-registers the token when the signed-in user changes.
 */
export function NativePushController() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const previousUidRef = useRef("");
  const previousPhoneRef = useRef("");

  useEffect(() => {
    if (isLoading || !notificationDeviceTokenService.isNativePush()) return;
    const uid = session?.uid ?? "";
    const previousUid = previousUidRef.current;
    const previousPhone = previousPhoneRef.current;
    previousUidRef.current = uid;
    previousPhoneRef.current = session?.phone ?? "";

    if (previousUid && previousUid !== uid) {
      void notificationDeviceTokenService.unregister(
        previousUid,
        previousPhone,
      );
    }
    if (!uid) return;

    void notificationDeviceTokenService.initialize(uid, session?.phone ?? "", {
      onReceived: async (notification) => {
        await notificationReceiver.receiveForeground(notification);
      },
      onAction: async (notification) => {
        const saved =
          await notificationReceiver.receiveForeground(notification);
        await notificationLifecycleService.markRead(uid, saved.id);
        if (saved.route?.href) router.push(saved.route.href);
      },
    });
  }, [isLoading, router, session?.phone, session?.uid]);

  return null;
}
