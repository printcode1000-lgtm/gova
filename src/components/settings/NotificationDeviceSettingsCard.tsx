"use client";

import { Bell } from "lucide-react";
import * as React from "react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { useSession } from "@/features/auth/components/SessionProvider";
import {
  notifications,
  type NotificationPermissionStateName,
} from "@/features/notifications";
import {
  isSpecialtyChatSessionTokenFailure,
  specialtyChatClient,
} from "@/features/specialty-chat";

/**
 * This device's notification state, plus the account's chat preferences.
 *
 * The push switch here is **per device**: turning it off unregisters this
 * device's FCM/APNs token or drops its Web Push subscription, and every other
 * device the account owns keeps receiving. It is deliberately not the
 * account-wide `pushEnabled` mute, which would silence all of them at once.
 */
export function NotificationDeviceSettingsCard() {
  const { t } = useTranslation();
  const { session } = useSession();
  const [notificationPlatform, setNotificationPlatform] = React.useState<
    "android" | "ios" | "web"
  >("web");
  const [notificationRuntimeReady, setNotificationRuntimeReady] =
    React.useState(false);
  const isAndroidNotifications = notificationPlatform === "android";
  const isIosNotifications = notificationPlatform === "ios";

  const [statusText, setStatusText] = React.useState("");
  const [permissionNotice, setPermissionNotice] = React.useState("");
  const [deviceBusy, setDeviceBusy] = React.useState(false);
  const [webPushPermission, setWebPushPermission] =
    React.useState<NotificationPermissionStateName>("unsupported");
  const [pushSupported, setPushSupported] = React.useState(false);
  const [deviceEnabled, setDeviceEnabled] = React.useState(false);
  const [nativePermission, setNativePermission] =
    React.useState<string>("unsupported");
  // Asked, never inferred from "is this native": only the Android shell owns a
  // settings screen this app can reach. iOS and the browser would otherwise get
  // a button whose call resolves `false` every time.
  const [canOpenSettings, setCanOpenSettings] = React.useState(false);
  const [specialtyRequestsEnabled, setSpecialtyRequestsEnabled] = React.useState(true);
  const [productConversationsEnabled, setProductConversationsEnabled] = React.useState(true);
  const [specialtyPreferenceBusy, setSpecialtyPreferenceBusy] = React.useState(false);
  const [productConversationsBusy, setProductConversationsBusy] = React.useState(false);
  // Read but never written here. The account-wide mute has no control any more;
  // this only detects an account left muted by the previous version so enabling
  // a device can repair it — see `enableThisDevice`.
  const accountMutedRef = React.useRef(false);

  // One read of the module's diagnostics answers every question this screen
  // asks about the device: which platform it is, whether push can work here,
  // whether this device already opted in, and what the OS currently permits.
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

  const isNativeNotifications = isAndroidNotifications || isIosNotifications;
  const currentPermission = isNativeNotifications
    ? nativePermission
    : webPushPermission;
  const permissionBlocked =
    currentPermission === "denied" || currentPermission === "blocked";

  const showStatus = (message: string) => {
    setStatusText(message);
    window.setTimeout(() => setStatusText(""), 3000);
  };

  const applyPermissionState = React.useCallback(
    (state: { state: NotificationPermissionStateName; canOpenSettings: boolean }) => {
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

  /**
   * Opt this device in: the OS permission first, then the platform's transport.
   *
   * `enableDevice` is the one call that covers both — it registers the FCM/APNs
   * token on a handset and creates the Web Push subscription in a browser — so
   * nothing above it branches on the platform.
   */
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
        // A refusal the OS will not prompt for again. Re-read the real state so
        // the card offers the recovery instead of repeating a request that can
        // no longer reach a prompt.
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

    // A stale account-wide mute would swallow every send even though this
    // device is now registered. Nothing can set that switch any more, so an
    // account left muted by the previous version is repaired here.
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

  /**
   * Re-read the OS permission and finish the opt-in when it is now granted.
   *
   * The single recovery path for a blocked permission on every platform:
   * Android returns here from its own settings screen, while iOS and the
   * browser come back after the user changed the permission themselves. A
   * granted permission alone delivers nothing — the device still has to be
   * registered, which `enableThisDevice` does.
   */
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

  // Attached only while the permission is blocked, which is the only state a
  // return to the app can resolve. Covers the Android settings round-trip and
  // the browser's address-bar permission change alike.
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
        console.warn("[NotificationDeviceSettingsCard] Failed to load chat preferences.", error);
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

  /**
   * The device switch. Off removes this device's registration only — other
   * devices on the account are untouched and keep receiving.
   */
  const updateDeviceNotifications = async (enabled: boolean) => {
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
  };

  const updateSpecialtyRequests = async (enabled: boolean) => {
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
  };

  const updateProductConversations = async (enabled: boolean) => {
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
  };

  /**
   * Opens the OS-level notification settings for this app.
   *
   * Rendered only where `canOpenSettings` is true — the Android shell — so this
   * is never a button whose call resolves `false`. The `visibilitychange`
   * listener above completes the recovery when the user comes back; the
   * fallback here covers the plugin failing to launch the screen at all.
   */
  const openNotificationSettings = async () => {
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
  };

  /**
   * The recovery offered where no settings screen can be reached — iOS today,
   * and the browser. The user changes the permission themselves, then presses
   * this.
   */
  const recheckPermission = async () => {
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
  };

  const permissionLabel =
    currentPermission === "granted"
      ? t("notifications.deviceCard.statusGranted")
      : permissionBlocked
        ? t("notifications.deviceCard.statusBlocked")
        : currentPermission === "default" || currentPermission === "prompt"
          ? t("notifications.deviceCard.statusPrompt")
          : t("notifications.deviceCard.statusUnsupported");
  const permissionTone =
    currentPermission === "granted"
      ? "bg-primary/10 text-primary"
      : permissionBlocked
        ? "bg-error/10 text-error"
        : "bg-surface-variant text-on-surface-variant";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-on-surface">
            {isAndroidNotifications
              ? t("notifications.deviceCard.titleAndroid")
              : isIosNotifications
                ? t("notifications.deviceCard.titleIos")
                : t("notifications.deviceCard.titleWeb")}
          </h2>
          <span
            className={cn(
              "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
              permissionTone,
            )}
          >
            {permissionLabel}
            {isNativeNotifications && deviceEnabled
              ? ` — ${isIosNotifications ? "APNs" : "FCM"}`
              : ""}
          </span>
        </div>
      </div>

      {statusText ? (
        <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary" role="status">
          {statusText}
        </p>
      ) : null}

      <div className="space-y-4 rounded-2xl asol-surface-neutral p-3 sm:p-4">
        {/*
          The switch is the control in every state the app can act on. Once the
          permission is blocked no switch can help — the OS will not prompt
          again — so the recovery actions take its place.
        */}
        {permissionBlocked ? (
          <div className="space-y-3">
            <div
              className={cn(
                "grid gap-2",
                canOpenSettings && "sm:grid-cols-2",
              )}
            >
              <button
                type="button"
                disabled={deviceBusy}
                onClick={() => void recheckPermission()}
                className="asol-control w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
              >
                {t("notifications.permissionPrompt.recheck")}
              </button>
              {canOpenSettings ? (
                <button
                  type="button"
                  disabled={deviceBusy}
                  onClick={() => void openNotificationSettings()}
                  className="asol-control w-full rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface disabled:opacity-60"
                >
                  {t("notifications.permissionPrompt.openSettings")}
                </button>
              ) : null}
            </div>
            <p className="rounded-lg bg-error/10 px-3 py-2 text-xs leading-relaxed text-error">
              {blockedNotice(canOpenSettings)}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface">
                {t("notifications.deviceCard.toggleTitle")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                {t("notifications.deviceCard.toggleDescription")}
              </p>
            </div>
            <ToggleSwitch
              checked={deviceEnabled}
              onChange={(enabled) => void updateDeviceNotifications(enabled)}
              label={t("notifications.deviceCard.toggleTitle")}
              disabled={
                deviceBusy ||
                !notificationRuntimeReady ||
                !pushSupported ||
                !session?.uid
              }
            />
          </div>
        )}

        {permissionNotice ? (
          <p className="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface-variant">
            {permissionNotice}
          </p>
        ) : null}

        {session?.sessionToken ? (
          <div className="grid gap-3">
            <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">{t("notifications.deviceCard.specialtyRequestsTitle")}</p>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{t("notifications.deviceCard.specialtyRequestsDescription")}</p>
              </div>
              <ToggleSwitch
                checked={specialtyRequestsEnabled}
                onChange={(enabled) => void updateSpecialtyRequests(enabled)}
                label={t("notifications.deviceCard.specialtyRequestsTitle")}
                disabled={specialtyPreferenceBusy}
              />
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">{t("notifications.deviceCard.productConversationsTitle")}</p>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">{t("notifications.deviceCard.productConversationsDescription")}</p>
              </div>
              <ToggleSwitch
                checked={productConversationsEnabled}
                onChange={(enabled) => void updateProductConversations(enabled)}
                label={t("notifications.deviceCard.productConversationsTitle")}
                disabled={productConversationsBusy}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
