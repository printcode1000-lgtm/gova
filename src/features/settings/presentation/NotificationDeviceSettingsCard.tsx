"use client";

import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";

import { ChatMessagePreferencesSection } from "./ChatMessagePreferencesSection";
import { NotificationDeviceToggleSection } from "./NotificationDeviceToggleSection";
import { SystemNotificationSettingsButton } from "./SystemNotificationSettingsButton";
import { useNotificationDeviceSettingsCard } from "./use-notification-device-settings-card";

/**
 * This device's notification state, plus the account's chat preferences.
 *
 * The push switch here is per device: turning it off unregisters this device's
 * FCM/APNs token or drops its Web Push subscription; other devices stay opted in.
 */
export function NotificationDeviceSettingsCard() {
  const state = useNotificationDeviceSettingsCard();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-on-surface">
            {state.isAndroidNotifications
              ? state.t("notifications.deviceCard.titleAndroid")
              : state.isIosNotifications
                ? state.t("notifications.deviceCard.titleIos")
                : state.t("notifications.deviceCard.titleWeb")}
          </h2>
          <span
            className={cn(
              "mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
              state.permissionTone,
            )}
          >
            {state.permissionLabel}
            {state.isNativeNotifications && state.deviceEnabled
              ? ` — ${state.isIosNotifications ? "APNs" : "FCM"}`
              : ""}
          </span>
        </div>
      </div>

      {state.statusText ? (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-medium",
            state.statusTone === "error"
              ? "bg-error/10 text-error"
              : "bg-primary/10 text-primary",
          )}
          role={state.statusTone === "error" ? "alert" : "status"}
        >
          {state.statusText}
        </p>
      ) : null}

      <div className="space-y-4 rounded-2xl asol-surface-neutral p-3 sm:p-4">
        <NotificationDeviceToggleSection state={state} />
        <SystemNotificationSettingsButton state={state} />
        <ChatMessagePreferencesSection state={state} />
      </div>
    </div>
  );
}
