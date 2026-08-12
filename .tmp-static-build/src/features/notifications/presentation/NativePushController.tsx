"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/components/SessionProvider";
import { nativePlatform } from "@/native-platform";
import { notificationsFacade } from "../public/notification-facade";
import { notificationLog } from "../domain/notification-redaction";

/**
 * Native push lifecycle for Android and iOS.
 *
 * Mounted once below `SessionProvider`. It attaches the received/tapped
 * handlers, imports notifications still sitting in the system tray, and
 * re-registers the token when the signed-in user changes.
 *
 * It goes through the module's own facade rather than the services beneath it,
 * so the four application states are handled in one place:
 *
 * - foreground: `onReceived` fires; the facade stores and counts it.
 * - background / terminated: the OS shows the notification and the WebView is
 *   not running, so nothing fires. Whatever the tray holds is imported by
 *   `initialize` on the next start.
 * - resumed: the app-state listener below imports the tray again, which is the
 *   only way a notification that arrived while the app was hidden reaches the
 *   centre without a restart.
 * - tapped, from any state: `onOpened` fires with the notification already
 *   marked read; this controller only follows its deep link, because routing is
 *   the shell's job and not the module's.
 *
 * It renders nothing. The post-login opt-in dialog is platform-agnostic and
 * lives in `NotificationOptInController`.
 */
export function NativePushController() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const previousUidRef = useRef("");
  const previousPhoneRef = useRef("");
  // Asked once: this controller owns FCM/APNs only. The browser is driven by
  // `WebPushController`, and running both against one session would unregister
  // a web subscription every time the signed-in user changed.
  const [isNativePush, setIsNativePush] = useState<boolean | null>(null);

  useEffect(() => {
    void notificationsFacade
      .getDiagnostics()
      .then((diagnostics) => setIsNativePush(diagnostics.nativePush))
      .catch(() => setIsNativePush(false));
  }, []);

  useEffect(() => {
    if (isLoading || !isNativePush) return;
    const uid = session?.uid ?? "";
    const previousUid = previousUidRef.current;
    const previousPhone = previousPhoneRef.current;
    previousUidRef.current = uid;
    previousPhoneRef.current = session?.phone ?? "";

    if (previousUid && previousUid !== uid) {
      void notificationsFacade.unregisterDevice({
        uid: previousUid,
        phone: previousPhone,
      });
    }
    if (!uid) return;

    void notificationsFacade
      .initialize({
        uid,
        phone: session?.phone ?? "",
        handlers: {
          onOpened: (notification) => {
            if (notification.route?.href) router.push(notification.route.href);
          },
        },
      })
      .catch((error) => {
        notificationLog.error("Native push initialization failed.", error);
      });
  }, [isLoading, isNativePush, router, session?.phone, session?.uid]);

  useEffect(() => {
    if (isLoading || !isNativePush || !session?.uid) return;
    let unsubscribe: (() => void) | undefined;
    void nativePlatform.app
      .onStateChange(({ isActive }) => {
        if (!isActive) return;
        void notificationsFacade.importDelivered().catch((error) => {
          notificationLog.error("Tray synchronization failed.", error);
        });
      })
      .then((remove) => {
        unsubscribe = remove;
      });
    return () => unsubscribe?.();
  }, [isLoading, isNativePush, session?.uid]);

  return null;
}
