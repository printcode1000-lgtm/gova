"use client";

import { Bell } from "lucide-react";

import { cn } from "@/shared/utils";

import { AccountDevicesSection } from "./AccountDevicesSection";
import { ChatMessagePreferencesSection } from "./ChatMessagePreferencesSection";
import { NotificationDeviceToggleSection } from "./NotificationDeviceToggleSection";
import { SelfTestNotificationButton } from "./SelfTestNotificationButton";
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
    <div id='features-settings-presentation-notificationdevicesettingscard-div-1-ox3cup' className="space-y-4">
      <div id='features-settings-presentation-notificationdevicesettingscard-div-2-njfsfo' className="flex items-center gap-3">
        <span id='features-settings-presentation-notificationdevicesettingscard-text-3-slikpy' className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <Bell id='features-settings-presentation-notificationdevicesettingscard-bell-4-eminhx' className="h-5 w-5 text-primary" />
        </span>
        <div id='features-settings-presentation-notificationdevicesettingscard-div-5-txp3sj' className="min-w-0">
          <h2 id='features-settings-presentation-notificationdevicesettingscard-heading-6-pm0zdg' className="truncate text-lg font-semibold text-on-surface">
            {state.isAndroidNotifications
              ? state.t("notifications.deviceCard.titleAndroid")
              : state.isIosNotifications
                ? state.t("notifications.deviceCard.titleIos")
                : state.t("notifications.deviceCard.titleWeb")}
          </h2>
          <span id='features-settings-presentation-notificationdevicesettingscard-text-7-s8pu2v'
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
        <p id='features-settings-presentation-notificationdevicesettingscard-text-8-nb3oee'
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

      <div id='features-settings-presentation-notificationdevicesettingscard-div-9-qxx7hx' className="space-y-4 rounded-2xl asol-surface-neutral p-3 sm:p-4">
        <NotificationDeviceToggleSection state={state} />
        <SelfTestNotificationButton state={state} />
        <SystemNotificationSettingsButton state={state} />
        <AccountDevicesSection state={state} />
        <ChatMessagePreferencesSection state={state} />
      </div>
    </div>
  );
}
