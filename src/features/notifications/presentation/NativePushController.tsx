"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/components/SessionProvider";
import { NativeCore } from "@asol/native-core";
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
 * - background / terminated: the WebView is not running, so nothing fires. The
 *   native push service persisted the payload to the application-private
 *   device-local inbox before it displayed anything, and `initialize` drains
 *   that inbox into IndexedDB on the next start.
 * - resumed: the app-state listener below drains it again, which is how a
 *   notification that arrived while the app was hidden reaches the centre
 *   without a restart.
 * - tapped, from any state: `onOpened` fires with the notification already
 *   stored and marked read.
 *
 * A tap opens the notification centre, not the notification's own deep link.
 * The link is preserved on the stored notification and is followed when the
 * user opens that card — so a cold start from a tap always lands somewhere that
 * shows every notification that arrived, including the ones not tapped, rather
 * than jumping straight into one order and hiding the rest.
 *
 * It renders nothing. The post-login opt-in dialog is platform-agnostic and
 * lives in `NotificationOptInController`.
 */
export function NativePushController() {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const previousUidRef = useRef("");
  const previousPhoneRef = useRef("");
  const [isNativePush, setIsNativePush] = useState<boolean | null>(null);

  useEffect(() => {
    void notificationsFacade
      .getDiagnostics()
      .then((diagnostics) => setIsNativePush(diagnostics.nativePush))
      .catch(() => setIsNativePush(false));
  }, []);

  useEffect(() => {
    if (isLoading || isNativePush !== true) return;

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
          onOpened: () => {
            router.push("/notifications");
          },
        },
      })
      .catch((error: unknown) => {
        notificationLog.error("Native push initialization failed.", error);
      });
  }, [isLoading, isNativePush, router, session?.phone, session?.uid]);

  useEffect(() => {
    if (isLoading || isNativePush !== true || !session?.uid) return;
    const uid = session.uid;
    let unsubscribe: (() => void) | undefined;
    void NativeCore.onAppStateChange(({ isActive }) => {
      if (!isActive) return;
      void notificationsFacade.importDelivered({ uid }).catch((error: unknown) => {
        notificationLog.error("Delivered-notification synchronization failed.", error);
      });
    }).then((res) => {
      if (res.ok) {
        unsubscribe = res.value;
      }
    });
    return () => unsubscribe?.();
  }, [isLoading, isNativePush, session?.uid]);

  return null;
}
