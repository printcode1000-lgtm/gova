"use client";

import { Bell } from "lucide-react";

import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { cn } from "@/lib/utils";

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
          className="rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
          role="status"
        >
          {state.statusText}
        </p>
      ) : null}

      <div className="space-y-4 rounded-2xl asol-surface-neutral p-3 sm:p-4">
        {state.permissionBlocked ? (
          <div className="space-y-3">
            <div
              className={cn(
                "grid gap-2",
                state.canOpenSettings && "sm:grid-cols-2",
              )}
            >
              <button
                type="button"
                disabled={state.deviceBusy}
                onClick={() => void state.recheckPermission()}
                className="asol-control w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
              >
                {state.t("notifications.permissionPrompt.recheck")}
              </button>
              {state.canOpenSettings ? (
                <button
                  type="button"
                  disabled={state.deviceBusy}
                  onClick={() => void state.openNotificationSettings()}
                  className="asol-control w-full rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface disabled:opacity-60"
                >
                  {state.t("notifications.permissionPrompt.openSettings")}
                </button>
              ) : null}
            </div>
            <p className="rounded-lg bg-error/10 px-3 py-2 text-xs leading-relaxed text-error">
              {state.blockedNotice(state.canOpenSettings)}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface">
                {state.t("notifications.deviceCard.toggleTitle")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                {state.t("notifications.deviceCard.toggleDescription")}
              </p>
            </div>
            <ToggleSwitch
              checked={state.deviceEnabled}
              onChange={(enabled) =>
                void state.updateDeviceNotifications(enabled)
              }
              label={state.t("notifications.deviceCard.toggleTitle")}
              disabled={
                state.deviceBusy ||
                !state.notificationRuntimeReady ||
                !state.pushSupported ||
                !state.session?.uid
              }
            />
          </div>
        )}

        {state.permissionNotice ? (
          <p className="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface-variant">
            {state.permissionNotice}
          </p>
        ) : null}

        {state.session?.sessionToken ? (
          <div className="grid gap-3">
            <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  {state.t("notifications.deviceCard.specialtyRequestsTitle")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  {state.t(
                    "notifications.deviceCard.specialtyRequestsDescription",
                  )}
                </p>
              </div>
              <ToggleSwitch
                checked={state.specialtyRequestsEnabled}
                onChange={(enabled) =>
                  void state.updateSpecialtyRequests(enabled)
                }
                label={state.t(
                  "notifications.deviceCard.specialtyRequestsTitle",
                )}
                disabled={state.specialtyPreferenceBusy}
              />
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  {state.t(
                    "notifications.deviceCard.productConversationsTitle",
                  )}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                  {state.t(
                    "notifications.deviceCard.productConversationsDescription",
                  )}
                </p>
              </div>
              <ToggleSwitch
                checked={state.productConversationsEnabled}
                onChange={(enabled) =>
                  void state.updateProductConversations(enabled)
                }
                label={state.t(
                  "notifications.deviceCard.productConversationsTitle",
                )}
                disabled={state.productConversationsBusy}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
