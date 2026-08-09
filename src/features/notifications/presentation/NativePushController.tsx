"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/features/auth/components/SessionProvider";
import {
  AUTH_LOGIN_COMPLETED_EVENT,
  type AuthLoginCompletedDetail,
} from "@/features/auth/application/auth-lifecycle-events";
import { notificationDeviceTokenService } from "../application/device-token-service";
import { notificationLifecycleService } from "../application/notification-lifecycle-service";
import { notificationReceiver } from "../application/notification-receiver";
import { notificationPermissionService } from "../application/permission-service";
import {
  NativeNotificationPromptActions,
  resolveNativeNotificationPromptAction,
  type NativeNotificationPromptAction,
} from "../application/native-notification-permission-policy";
import { NativeNotificationPermissionPrompt } from "./NativeNotificationPermissionPrompt";

const POST_LOGIN_PROMPT_DELAY_MS = 4_200;

interface PermissionPromptState {
  uid: string;
  phone: string;
  action: NativeNotificationPromptAction;
  busy: boolean;
  failed: boolean;
  permissionDenied: boolean;
}

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
  const activeUidRef = useRef("");
  const promptTimerRef = useRef<number | null>(null);
  const [permissionPrompt, setPermissionPrompt] =
    useState<PermissionPromptState | null>(null);

  useEffect(() => {
    activeUidRef.current = session?.uid ?? "";
    if (!session?.uid) {
      if (promptTimerRef.current !== null) {
        window.clearTimeout(promptTimerRef.current);
        promptTimerRef.current = null;
      }
      setPermissionPrompt(null);
      return;
    }
    if (permissionPrompt && permissionPrompt.uid !== session.uid) {
      setPermissionPrompt(null);
    }
  }, [permissionPrompt?.uid, session?.uid]);

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

    void notificationDeviceTokenService
      .initialize(uid, session?.phone ?? "", {
        onReceived: async (notification) => {
          await notificationReceiver.receiveForeground(notification);
        },
        onAction: async (notification) => {
          const saved =
            await notificationReceiver.receiveForeground(notification);
          await notificationLifecycleService.markRead(uid, saved.id);
          if (saved.route?.href) router.push(saved.route.href);
        },
      })
      .catch((error) => {
        console.error("[Notifications] Native push initialization failed.", error);
      });
  }, [isLoading, router, session?.phone, session?.uid]);

  const inspectFreshLogin = useCallback(
    async ({ uid, phone }: AuthLoginCompletedDetail) => {
      if (!notificationDeviceTokenService.isNativePush()) return;
      try {
        const [deviceEnabled, permission] = await Promise.all([
          notificationDeviceTokenService.isNativeEnabled(),
          notificationPermissionService.checkResult(),
        ]);
        const action = resolveNativeNotificationPromptAction({
          authenticated: Boolean(uid),
          nativePushSupported: true,
          deviceEnabled,
          permissionState: permission.state,
        });
        if (action === NativeNotificationPromptActions.Hidden) return;

        if (promptTimerRef.current !== null) {
          window.clearTimeout(promptTimerRef.current);
        }
        promptTimerRef.current = window.setTimeout(() => {
          promptTimerRef.current = null;
          if (activeUidRef.current !== uid) return;
          setPermissionPrompt({
            uid,
            phone,
            action,
            busy: false,
            failed: false,
            permissionDenied:
              permission.state === "denied" || permission.state === "blocked",
          });
        }, POST_LOGIN_PROMPT_DELAY_MS);
      } catch (error) {
        console.error(
          "[Notifications] Unable to inspect the post-login permission state.",
          error,
        );
      }
    },
    [],
  );

  useEffect(() => {
    const onLoginCompleted = (event: Event) => {
      const detail = (event as CustomEvent<AuthLoginCompletedDetail>).detail;
      if (!detail?.uid || !detail.phone) return;
      void inspectFreshLogin(detail);
    };
    window.addEventListener(AUTH_LOGIN_COMPLETED_EVENT, onLoginCompleted);
    return () => {
      window.removeEventListener(AUTH_LOGIN_COMPLETED_EVENT, onLoginCompleted);
      if (promptTimerRef.current !== null) {
        window.clearTimeout(promptTimerRef.current);
        promptTimerRef.current = null;
      }
    };
  }, [inspectFreshLogin]);

  const registerPromptDevice = useCallback(async (state: PermissionPromptState) => {
    await notificationDeviceTokenService.register(state.uid, state.phone);
    setPermissionPrompt(null);
  }, []);

  const checkAfterSettings = useCallback(async () => {
    const current = permissionPrompt;
    if (!current || current.busy) return;
    const permission = await notificationPermissionService.checkResult();
    if (!permission.granted) return;
    setPermissionPrompt((value) =>
      value ? { ...value, busy: true, failed: false } : value,
    );
    try {
      await registerPromptDevice(current);
    } catch (error) {
      console.error(
        "[Notifications] Device registration after settings failed.",
        error,
      );
      setPermissionPrompt((value) =>
        value ? { ...value, busy: false, failed: true } : value,
      );
    }
  }, [permissionPrompt, registerPromptDevice]);

  useEffect(() => {
    if (
      !permissionPrompt ||
      permissionPrompt.action !== NativeNotificationPromptActions.OpenSettings
    ) {
      return;
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkAfterSettings();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [checkAfterSettings, permissionPrompt]);

  const handlePermissionPrimary = useCallback(async () => {
    const current = permissionPrompt;
    if (!current || current.busy) return;
    setPermissionPrompt({ ...current, busy: true, failed: false });
    try {
      if (current.action === NativeNotificationPromptActions.OpenSettings) {
        const permission = await notificationPermissionService.checkResult();
        if (permission.granted) {
          await registerPromptDevice(current);
          return;
        }
        const opened = await notificationPermissionService.openSettings();
        if (!opened) throw new Error("notificationSettingsUnavailable");
        setPermissionPrompt((value) =>
          value ? { ...value, busy: false } : value,
        );
        return;
      }

      const permission = await notificationPermissionService.requestResult();
      if (!permission.granted) {
        const canAskAgain = permission.state === "prompt";
        setPermissionPrompt({
          ...current,
          action: canAskAgain
            ? NativeNotificationPromptActions.Request
            : NativeNotificationPromptActions.OpenSettings,
          busy: false,
          failed: false,
          permissionDenied: !canAskAgain,
        });
        return;
      }
      await registerPromptDevice(current);
    } catch (error) {
      console.error("[Notifications] Push opt-in failed.", error);
      setPermissionPrompt((value) =>
        value ? { ...value, busy: false, failed: true } : value,
      );
    }
  }, [permissionPrompt, registerPromptDevice]);

  return (
    <NativeNotificationPermissionPrompt
      open={Boolean(permissionPrompt)}
      action={
        permissionPrompt?.action ?? NativeNotificationPromptActions.Hidden
      }
      busy={permissionPrompt?.busy ?? false}
      failed={permissionPrompt?.failed ?? false}
      permissionDenied={permissionPrompt?.permissionDenied ?? false}
      onPrimary={() => void handlePermissionPrimary()}
      onLater={() => setPermissionPrompt(null)}
    />
  );
}
