"use client";

import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils";

import { SettingsToggleRow } from "./SettingsToggleRow";
import type { NotificationDeviceSettingsCardState } from "./use-notification-device-settings-card";

/**
 * This device's push controls: the blocked-permission recovery actions, or the
 * per-device switch, plus whatever notice explains the current state.
 */
export function NotificationDeviceToggleSection({
  state,
}: {
  state: NotificationDeviceSettingsCardState;
}) {
  if (!state.notificationRuntimeReady) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-20 w-full rounded-xl" />
        <span className="sr-only">{state.t("common.loading")}</span>
      </div>
    );
  }

  const toggleUnavailable =
    !state.pushSupported || !state.session?.uid || state.deviceBusy;

  return (
    <div className="space-y-4">
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
        <SettingsToggleRow
          emphasised
          title={state.t("notifications.deviceCard.toggleTitle")}
          description={state.t("notifications.deviceCard.toggleDescription")}
          checked={state.deviceEnabled}
          disabled={toggleUnavailable}
          onChange={(enabled) => void state.updateDeviceNotifications(enabled)}
        />
      )}

      {!state.permissionBlocked && !state.pushSupported ? (
        <p className="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface-variant">
          {state.t("notifications.deviceCard.pushUnsupported")}
        </p>
      ) : null}

      {state.permissionNotice ? (
        <p
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            state.permissionNoticeTone === "error"
              ? "bg-error/10 text-error"
              : "bg-surface text-on-surface-variant",
          )}
          role={state.permissionNoticeTone === "error" ? "alert" : "status"}
        >
          {state.permissionNotice}
        </p>
      ) : null}
    </div>
  );
}
