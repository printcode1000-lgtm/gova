"use client";

import * as React from "react";

import { useSession } from "@/features/auth/components/SessionProvider";
import {
  notifications,
  type NotificationPermissionStateName,
} from "@/features/notifications";
import { useTranslation } from "@/lib/i18n";

import {
  notificationPermissionLabel,
  notificationPermissionTone,
} from "./notification-device-settings-card-model";
import type { ShowSettingsStatus } from "./use-settings-status-banner";

export type NotificationNoticeTone = "info" | "error";

/**
 * This device's push state: the permission, the per-device switch, and the
 * recovery actions for a blocked permission. Account-level message preferences
 * are a different concern and live in `use-chat-message-preferences`.
 */
export function useNotificationDeviceToggle(showStatus: ShowSettingsStatus) {
  const { t } = useTranslation();
  const { session } = useSession();
  const [notificationPlatform, setNotificationPlatform] = React.useState<
    "android" | "ios" | "web"
  >("web");
  const [notificationRuntimeReady, setNotificationRuntimeReady] =
    React.useState(false);
  const [permissionNotice, setPermissionNotice] = React.useState("");
  const [permissionNoticeTone, setPermissionNoticeTone] =
    React.useState<NotificationNoticeTone>("info");
  const [deviceBusy, setDeviceBusy] = React.useState(false);
  const [webPushPermission, setWebPushPermission] =
    React.useState<NotificationPermissionStateName>("unsupported");
  const [pushSupported, setPushSupported] = React.useState(false);
  const [deviceEnabled, setDeviceEnabled] = React.useState(false);
  const [nativePermission, setNativePermission] =
    React.useState<string>("unsupported");
  const [canOpenSettings, setCanOpenSettings] = React.useState(false);
  const accountMutedRef = React.useRef(false);

  const isAndroidNotifications = notificationPlatform === "android";
  const isIosNotifications = notificationPlatform === "ios";
  const isNativeNotifications = isAndroidNotifications || isIosNotifications;
  const currentPermission = isNativeNotifications
    ? nativePermission
    : webPushPermission;
  const permissionBlocked =
    currentPermission === "denied" || currentPermission === "blocked";

  const showNotice = React.useCallback(
    (message: string, tone: NotificationNoticeTone = "info") => {
      setPermissionNoticeTone(tone);
      setPermissionNotice(message);
    },
    [],
  );

  const clearNotice = React.useCallback(() => setPermissionNotice(""), []);

  const loadNotificationState = React.useCallback(async () => {
    const diagnostics = await notifications.getDiagnostics();
    setNotificationPlatform(diagnostics.platform);
    setPushSupported(diagnostics.pushSupported);
    setWebPushPermission(diagnostics.permission.state);
    setDeviceEnabled(diagnostics.deviceEnabled);
    setNativePermission(diagnostics.permission.state);
    setCanOpenSettings(diagnostics.permission.canOpenSettings);
    setNotificationRuntimeReady(true);
  }, []);

  React.useEffect(() => {
    void loadNotificationState();
  }, [loadNotificationState]);

  const applyPermissionState = React.useCallback(
    (state: {
      state: NotificationPermissionStateName;
      canOpenSettings: boolean;
    }) => {
      setCanOpenSettings(state.canOpenSettings);
      if (isNativeNotifications) {
        setNativePermission(state.state);
      } else {
        setWebPushPermission(state.state);
      }
    },
    [isNativeNotifications],
  );

  const blockedNotice = React.useCallback(
    (settingsReachable: boolean) =>
      settingsReachable
        ? t("notifications.permissionPrompt.denied")
        : t("notifications.permissionPrompt.deniedManual"),
    [t],
  );

  const enableThisDevice = React.useCallback(async (): Promise<boolean> => {
    if (!session?.uid) {
      showNotice(t("notifications.deviceCard.loginRequired"), "error");
      return false;
    }

    const before = await notifications.getPermissionState();
    applyPermissionState(before);
    if (before.state === "denied" || before.state === "blocked") {
      showNotice(blockedNotice(before.canOpenSettings));
      return false;
    }

    if (!before.granted) {
      const permission = await notifications.requestPermission();
      if (permission !== "granted") {
        const after = await notifications.getPermissionState();
        applyPermissionState(after);
        showNotice(blockedNotice(after.canOpenSettings));
        return false;
      }
    }

    await notifications.enableDevice({
      uid: session.uid,
      phone: session.phone,
    });

    if (accountMutedRef.current) {
      await notifications.setPushPreference({
        uid: session.uid,
        phone: session.phone,
        pushEnabled: true,
      });
      accountMutedRef.current = false;
    }

    await loadNotificationState();
    clearNotice();
    return true;
  }, [
    applyPermissionState,
    blockedNotice,
    clearNotice,
    loadNotificationState,
    session,
    showNotice,
    t,
  ]);

  const syncAfterPermissionChange = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const state = await notifications.getPermissionState();
      applyPermissionState(state);
      if (!state.granted) {
        if (!silent) showNotice(blockedNotice(state.canOpenSettings));
        return false;
      }
      return enableThisDevice();
    },
    [applyPermissionState, blockedNotice, enableThisDevice, showNotice],
  );

  React.useEffect(() => {
    if (!permissionBlocked) return;
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void syncAfterPermissionChange({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [permissionBlocked, syncAfterPermissionChange]);

  React.useEffect(() => {
    if (!session?.uid) return;
    void notifications
      .getPushPreference({ uid: session.uid, phone: session.phone })
      .then((preference) => {
        accountMutedRef.current = !preference.pushEnabled;
      })
      .catch((error) => {
        console.warn(
          "[NotificationDeviceSettingsCard] Failed to load the push preference.",
          error,
        );
      });
  }, [session]);

  const updateDeviceNotifications = React.useCallback(
    async (enabled: boolean) => {
      if (!session?.uid || deviceBusy) return;
      setDeviceBusy(true);
      clearNotice();
      try {
        if (!enabled) {
          await notifications.unregisterDevice({
            uid: session.uid,
            phone: session.phone,
          });
          await loadNotificationState();
          showStatus(t("notifications.deviceCard.disabledStatus"));
          return;
        }

        if (!(await enableThisDevice())) return;
        showStatus(
          isNativeNotifications
            ? t("notifications.deviceCard.enabledStatusNative", {
                platform: isIosNotifications ? "iOS" : "Android",
              })
            : t("notifications.deviceCard.enabledStatusWeb"),
        );
      } catch (error) {
        showNotice(
          error instanceof Error
            ? error.message
            : t("notifications.deviceCard.updateError"),
          "error",
        );
      } finally {
        setDeviceBusy(false);
      }
    },
    [
      showStatus,
      clearNotice,
      deviceBusy,
      enableThisDevice,
      isIosNotifications,
      isNativeNotifications,
      loadNotificationState,
      session,
      showNotice,
      t,
    ],
  );

  const openNotificationSettings = React.useCallback(async () => {
    setDeviceBusy(true);
    clearNotice();
    try {
      const opened = await notifications.openPermissionSettings();
      if (opened) return;
      await syncAfterPermissionChange();
    } catch (error) {
      showNotice(
        error instanceof Error
          ? error.message
          : t("notifications.deviceCard.openSettingsError"),
        "error",
      );
    } finally {
      setDeviceBusy(false);
    }
  }, [clearNotice, showNotice, syncAfterPermissionChange, t]);

  const recheckPermission = React.useCallback(async () => {
    setDeviceBusy(true);
    clearNotice();
    try {
      await syncAfterPermissionChange();
    } catch (error) {
      showNotice(
        error instanceof Error
          ? error.message
          : t("notifications.deviceCard.recheckError"),
        "error",
      );
    } finally {
      setDeviceBusy(false);
    }
  }, [clearNotice, showNotice, syncAfterPermissionChange, t]);

  return {
    blockedNotice,
    canOpenSettings,
    deviceBusy,
    deviceEnabled,
    isAndroidNotifications,
    isIosNotifications,
    isNativeNotifications,
    notificationRuntimeReady,
    openNotificationSettings,
    permissionBlocked,
    permissionLabel: notificationPermissionLabel(
      currentPermission,
      permissionBlocked,
      t,
    ),
    permissionNotice,
    permissionNoticeTone,
    permissionTone: notificationPermissionTone(
      currentPermission,
      permissionBlocked,
    ),
    pushSupported,
    recheckPermission,
    refreshDeviceState: loadNotificationState,
    updateDeviceNotifications,
  };
}
