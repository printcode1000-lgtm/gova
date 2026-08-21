"use client";

import * as React from "react";

import { useSession } from "@/features/auth/components/SessionProvider";
import {
  notifications,
  type NotificationPermissionStateName,
} from "@/features/notifications";
import {
  isSpecialtyChatSessionTokenFailure,
  specialtyChatClient,
} from "@/features/specialty-chat";
import { useTranslation } from "@/lib/i18n";
import {
  notificationPermissionLabel,
  notificationPermissionTone,
} from "./notification-device-settings-card-model";

export function useNotificationDeviceSettingsCard() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [notificationPlatform, setNotificationPlatform] = React.useState<
    "android" | "ios" | "web"
  >("web");
  const [notificationRuntimeReady, setNotificationRuntimeReady] =
    React.useState(false);
  const [statusText, setStatusText] = React.useState("");
  const [permissionNotice, setPermissionNotice] = React.useState("");
  const [deviceBusy, setDeviceBusy] = React.useState(false);
  const [webPushPermission, setWebPushPermission] =
    React.useState<NotificationPermissionStateName>("unsupported");
  const [pushSupported, setPushSupported] = React.useState(false);
  const [deviceEnabled, setDeviceEnabled] = React.useState(false);
  const [nativePermission, setNativePermission] =
    React.useState<string>("unsupported");
  const [canOpenSettings, setCanOpenSettings] = React.useState(false);
  const [specialtyRequestsEnabled, setSpecialtyRequestsEnabled] =
    React.useState(true);
  const [productConversationsEnabled, setProductConversationsEnabled] =
    React.useState(true);
  const [specialtyPreferenceBusy, setSpecialtyPreferenceBusy] =
    React.useState(false);
  const [productConversationsBusy, setProductConversationsBusy] =
    React.useState(false);
  const accountMutedRef = React.useRef(false);

  const isAndroidNotifications = notificationPlatform === "android";
  const isIosNotifications = notificationPlatform === "ios";
  const isNativeNotifications = isAndroidNotifications || isIosNotifications;
  const currentPermission = isNativeNotifications
    ? nativePermission
    : webPushPermission;
  const permissionBlocked =
    currentPermission === "denied" || currentPermission === "blocked";

  const showStatus = React.useCallback((message: string) => {
    setStatusText(message);
    window.setTimeout(() => setStatusText(""), 3000);
  }, []);

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
      setPermissionNotice(t("notifications.deviceCard.loginRequired"));
      return false;
    }

    const before = await notifications.getPermissionState();
    applyPermissionState(before);
    if (before.state === "denied" || before.state === "blocked") {
      setPermissionNotice(blockedNotice(before.canOpenSettings));
      return false;
    }

    if (!before.granted) {
      const permission = await notifications.requestPermission();
      if (permission !== "granted") {
        const after = await notifications.getPermissionState();
        applyPermissionState(after);
        setPermissionNotice(blockedNotice(after.canOpenSettings));
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
    setPermissionNotice("");
    return true;
  }, [applyPermissionState, blockedNotice, loadNotificationState, session, t]);

  const syncAfterPermissionChange = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const state = await notifications.getPermissionState();
      applyPermissionState(state);
      if (!state.granted) {
        if (!silent) setPermissionNotice(blockedNotice(state.canOpenSettings));
        return false;
      }
      return enableThisDevice();
    },
    [applyPermissionState, blockedNotice, enableThisDevice],
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
    if (!session?.sessionToken) return;
    void specialtyChatClient
      .preferences(session)
      .then((preferences) => {
        setSpecialtyRequestsEnabled(preferences.specialtyRequestsEnabled);
        setProductConversationsEnabled(preferences.productConversationsEnabled);
      })
      .catch((error) => {
        if (isSpecialtyChatSessionTokenFailure(error)) return;
        console.warn(
          "[NotificationDeviceSettingsCard] Failed to load chat preferences.",
          error,
        );
      });
  }, [session]);

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
      setPermissionNotice("");
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
        setPermissionNotice(
          error instanceof Error
            ? error.message
            : t("notifications.deviceCard.updateError"),
        );
      } finally {
        setDeviceBusy(false);
      }
    },
    [
      deviceBusy,
      enableThisDevice,
      isIosNotifications,
      isNativeNotifications,
      loadNotificationState,
      session,
      showStatus,
      t,
    ],
  );

  const updateSpecialtyRequests = React.useCallback(
    async (enabled: boolean) => {
      if (!session?.sessionToken || specialtyPreferenceBusy) return;
      setSpecialtyPreferenceBusy(true);
      try {
        const value = await specialtyChatClient.preferences(session, {
          specialtyRequestsEnabled: enabled,
        });
        setSpecialtyRequestsEnabled(value.specialtyRequestsEnabled);
        showStatus(
          value.specialtyRequestsEnabled
            ? t("notifications.deviceCard.specialtyRequestsOn")
            : t("notifications.deviceCard.specialtyRequestsOff"),
        );
      } catch (error) {
        showStatus(
          error instanceof Error
            ? error.message
            : t("notifications.deviceCard.specialtyRequestsError"),
        );
      } finally {
        setSpecialtyPreferenceBusy(false);
      }
    },
    [session, showStatus, specialtyPreferenceBusy, t],
  );

  const updateProductConversations = React.useCallback(
    async (enabled: boolean) => {
      if (!session?.sessionToken || productConversationsBusy) return;
      setProductConversationsBusy(true);
      try {
        const value = await specialtyChatClient.preferences(session, {
          productConversationsEnabled: enabled,
        });
        setProductConversationsEnabled(value.productConversationsEnabled);
        showStatus(
          value.productConversationsEnabled
            ? t("notifications.deviceCard.productConversationsOn")
            : t("notifications.deviceCard.productConversationsOff"),
        );
      } catch (error) {
        showStatus(
          error instanceof Error
            ? error.message
            : t("notifications.deviceCard.productConversationsError"),
        );
      } finally {
        setProductConversationsBusy(false);
      }
    },
    [productConversationsBusy, session, showStatus, t],
  );

  const openNotificationSettings = React.useCallback(async () => {
    setDeviceBusy(true);
    setPermissionNotice("");
    try {
      const opened = await notifications.openPermissionSettings();
      if (opened) return;
      await syncAfterPermissionChange();
    } catch (error) {
      setPermissionNotice(
        error instanceof Error
          ? error.message
          : t("notifications.deviceCard.openSettingsError"),
      );
    } finally {
      setDeviceBusy(false);
    }
  }, [syncAfterPermissionChange, t]);

  const recheckPermission = React.useCallback(async () => {
    setDeviceBusy(true);
    setPermissionNotice("");
    try {
      await syncAfterPermissionChange();
    } catch (error) {
      setPermissionNotice(
        error instanceof Error
          ? error.message
          : t("notifications.deviceCard.recheckError"),
      );
    } finally {
      setDeviceBusy(false);
    }
  }, [syncAfterPermissionChange, t]);

  const permissionLabel = notificationPermissionLabel(
    currentPermission,
    permissionBlocked,
    t,
  );
  const permissionTone = notificationPermissionTone(
    currentPermission,
    permissionBlocked,
  );

  return {
    canOpenSettings,
    deviceBusy,
    deviceEnabled,
    isAndroidNotifications,
    isIosNotifications,
    isNativeNotifications,
    notificationRuntimeReady,
    permissionBlocked,
    permissionLabel,
    permissionNotice,
    permissionTone,
    productConversationsBusy,
    productConversationsEnabled,
    pushSupported,
    recheckPermission,
    session,
    specialtyPreferenceBusy,
    specialtyRequestsEnabled,
    statusText,
    t,
    updateDeviceNotifications,
    updateProductConversations,
    updateSpecialtyRequests,
    openNotificationSettings,
    blockedNotice,
  };
}
