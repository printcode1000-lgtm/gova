"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NativeCore } from "@asol/native-core";
import { notificationsFacade } from "../application/public/notification-facade";
import { notificationLog } from "../domain/notification-redaction";
import { useNotificationRuntime } from "./NotificationRuntimeProvider";

export function NativePushController() {
  const router = useRouter();
  const { identity: session, isLoading } = useNotificationRuntime();
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
      if (res.ok) unsubscribe = res.value;
    });
    return () => unsubscribe?.();
  }, [isLoading, isNativePush, session?.uid]);

  return null;
}
