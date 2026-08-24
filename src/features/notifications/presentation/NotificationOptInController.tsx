"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { notificationDeviceTokenService } from "../application/device-token-service";
import { notificationPermissionService } from "../application/permission-service";
import {
  NotificationPromptActions,
  resolveNotificationPromptAction,
  type NotificationPromptAction,
} from "../application/notification-permission-prompt-policy";
import { NotificationPermissionPrompt } from "./NotificationPermissionPrompt";
import { notificationLog } from "../domain/notification-redaction";
import { useNotificationRuntime } from "./NotificationRuntimeProvider";

const POST_LOGIN_PROMPT_DELAY_MS = 4_200;

interface PermissionPromptState {
  uid: string;
  phone: string;
  action: NotificationPromptAction;
  busy: boolean;
  failed: boolean;
  permissionDenied: boolean;
}

export function NotificationOptInController() {
  const { identity: session, loginCompleted } = useNotificationRuntime();
  const activeUidRef = useRef("");
  const promptTimerRef = useRef<number | null>(null);
  const [canOpenSettings, setCanOpenSettings] = useState(false);
  const [permissionPrompt, setPermissionPrompt] =
    useState<PermissionPromptState | null>(null);

  useEffect(() => {
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
    async ({ uid, phone }: { uid: string; phone: string }) => {
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
        notificationLog.error(
          "Unable to inspect the post-login permission state.",
          error,
        );
      }
    },
    [],
  );

  useEffect(() => {
    if (!loginCompleted) return;
    void inspectFreshLogin(loginCompleted);
  }, [inspectFreshLogin, loginCompleted]);

  useEffect(() => () => {
    if (promptTimerRef.current !== null) {
      window.clearTimeout(promptTimerRef.current);
      promptTimerRef.current = null;
    }
  }, []);

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
      notificationLog.error(
        "Device registration after settings failed.",
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
        const opened = await notificationPermissionService.openSettings();
        if (!opened) {
          notificationLog.warn(
            "The application settings screen did not open; the user re-checks instead.",
          );
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
      notificationLog.error("Push opt-in failed.", error);
      setPermissionPrompt((value) =>
        value ? { ...value, busy: false, failed: true } : value,
      );
    }
  }, [enablePromptDevice, permissionPrompt]);

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
