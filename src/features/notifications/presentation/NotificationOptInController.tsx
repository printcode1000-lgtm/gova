"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSession } from "@/features/auth/components/SessionProvider";
import {
  AUTH_LOGIN_COMPLETED_EVENT,
  type AuthLoginCompletedDetail,
} from "@/features/auth/application/auth-lifecycle-events";
import { notificationDeviceTokenService } from "../application/device-token-service";
import { notificationPermissionService } from "../application/permission-service";
import {
  NotificationPromptActions,
  resolveNotificationPromptAction,
  type NotificationPromptAction,
} from "../application/notification-permission-prompt-policy";
import { NotificationPermissionPrompt } from "./NotificationPermissionPrompt";

const POST_LOGIN_PROMPT_DELAY_MS = 4_200;

interface PermissionPromptState {
  uid: string;
  phone: string;
  action: NotificationPromptAction;
  busy: boolean;
  failed: boolean;
  permissionDenied: boolean;
}

/**
 * Post-login notification opt-in, on every platform.
 *
 * Android and iOS opt in by registering an FCM/APNs token; the browser opts in
 * by subscribing to Web Push. `DeviceTokenService.enable` hides that split, so
 * this controller only owns the dialog and its states.
 *
 * It reacts to `AUTH_LOGIN_COMPLETED_EVENT` — a fresh interactive login, not
 * session hydration — so a returning user is never interrupted on every load.
 */
export function NotificationOptInController() {
  const { session } = useSession();
  const activeUidRef = useRef("");
  const promptTimerRef = useRef<number | null>(null);
  const [canOpenSettings, setCanOpenSettings] = useState(false);
  const [permissionPrompt, setPermissionPrompt] =
    useState<PermissionPromptState | null>(null);

  useEffect(() => {
    // Asked, not assumed: only the Android shell can reach a settings screen.
    // iOS and the browser get the re-check recovery instead of a dead button.
    setCanOpenSettings(notificationPermissionService.canOpenSettings());
  }, []);

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

  const inspectFreshLogin = useCallback(
    async ({ uid, phone }: AuthLoginCompletedDetail) => {
      const pushSupported = notificationDeviceTokenService.isPushSupported();
      if (!pushSupported) return;
      try {
        const [deviceEnabled, permission] = await Promise.all([
          notificationDeviceTokenService.isDeviceEnabled(),
          notificationPermissionService.checkResult(),
        ]);
        const action = resolveNotificationPromptAction({
          authenticated: Boolean(uid),
          pushSupported,
          deviceEnabled,
          permissionState: permission.state,
        });
        if (action === NotificationPromptActions.Hidden) return;

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

  const enablePromptDevice = useCallback(async (state: PermissionPromptState) => {
    await notificationDeviceTokenService.enable(state.uid, state.phone);
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
      await enablePromptDevice(current);
    } catch (error) {
      console.error(
        "[Notifications] Device registration after settings failed.",
        error,
      );
      setPermissionPrompt((value) =>
        value ? { ...value, busy: false, failed: true } : value,
      );
    }
  }, [enablePromptDevice, permissionPrompt]);

  useEffect(() => {
    if (
      !permissionPrompt ||
      permissionPrompt.action !== NotificationPromptActions.OpenSettings
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
      if (current.action === NotificationPromptActions.OpenSettings) {
        const permission = await notificationPermissionService.checkResult();
        if (permission.granted) {
          await enablePromptDevice(current);
          return;
        }
        // In a browser this resolves false. The user re-checks after changing
        // the site permission, so the dialog stays put rather than failing.
        const opened = await notificationPermissionService.openSettings();
        if (!opened && canOpenSettings) {
          throw new Error("notificationSettingsUnavailable");
        }
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
            ? NotificationPromptActions.Request
            : NotificationPromptActions.OpenSettings,
          busy: false,
          failed: false,
          permissionDenied: !canAskAgain,
        });
        return;
      }
      await enablePromptDevice(current);
    } catch (error) {
      console.error("[Notifications] Push opt-in failed.", error);
      setPermissionPrompt((value) =>
        value ? { ...value, busy: false, failed: true } : value,
      );
    }
  }, [canOpenSettings, enablePromptDevice, permissionPrompt]);

  return (
    <NotificationPermissionPrompt
      open={Boolean(permissionPrompt)}
      action={permissionPrompt?.action ?? NotificationPromptActions.Hidden}
      busy={permissionPrompt?.busy ?? false}
      failed={permissionPrompt?.failed ?? false}
      permissionDenied={permissionPrompt?.permissionDenied ?? false}
      canOpenSettings={canOpenSettings}
      onPrimary={() => void handlePermissionPrimary()}
      onLater={() => setPermissionPrompt(null)}
    />
  );
}
