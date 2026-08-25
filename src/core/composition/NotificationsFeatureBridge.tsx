"use client";

import * as React from "react";

import { registerBrowserPorts } from "@/core/composition/browser-ports";
import {
  AUTH_LOGIN_COMPLETED_EVENT,
  useSession,
  type AuthLoginCompletedDetail,
} from "@/features/auth/ui";
import { notifications } from "@/features/notifications";
import {
  NativePushController,
  NotificationOptInController,
  NotificationRuntimeProvider,
  WebPushController,
  type NotificationLoginCompleted,
} from "@/features/notifications/ui";
import { notifyOrderDataRefreshFromNotification } from "@/features/orders";

registerBrowserPorts();

/**
 * Browser composition boundary for notifications.
 *
 * Notifications never imports auth or orders. This root supplies the current
 * identity and registers order-specific behaviour through public feature APIs.
 */
export function NotificationsFeatureBridge({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useSession();
  const sequenceRef = React.useRef(0);
  const [loginCompleted, setLoginCompleted] =
    React.useState<NotificationLoginCompleted | null>(null);

  React.useEffect(
    () =>
      notifications.registerStoredExtension({
        id: "orders-data-refresh",
        onStored: notifyOrderDataRefreshFromNotification,
      }),
    [],
  );

  React.useEffect(() => {
    const onLoginCompleted = (event: Event) => {
      const detail = (event as CustomEvent<AuthLoginCompletedDetail>).detail;
      if (!detail?.uid || !detail.phone) return;
      sequenceRef.current += 1;
      setLoginCompleted({
        uid: detail.uid,
        phone: detail.phone,
        sequence: sequenceRef.current,
      });
    };
    window.addEventListener(AUTH_LOGIN_COMPLETED_EVENT, onLoginCompleted);
    return () => window.removeEventListener(AUTH_LOGIN_COMPLETED_EVENT, onLoginCompleted);
  }, []);

  const identity = React.useMemo(
    () =>
      session?.uid
        ? { uid: session.uid, phone: session.phone ?? "" }
        : null,
    [session?.phone, session?.uid],
  );

  return (
    <NotificationRuntimeProvider
      identity={identity}
      isLoading={isLoading}
      loginCompleted={loginCompleted}
    >
      <NativePushController />
      <WebPushController />
      <NotificationOptInController />
      {children}
    </NotificationRuntimeProvider>
  );
}
