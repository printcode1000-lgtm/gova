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
      <div id='features-settings-presentation-notificationdevicetogglesection-div-1-iswepl' className="space-y-2" aria-busy="true">
        <Skeleton id='features-settings-presentation-notificationdevicetogglesection-skeleton-2-2tm5bx' className="h-20 w-full rounded-xl" />
        <span id='features-settings-presentation-notificationdevicetogglesection-text-3-tcyu43' className="sr-only">{state.t("common.loading")}</span>
      </div>
    );
  }

  const toggleUnavailable =
    !state.pushSupported || !state.session?.uid || state.deviceBusy;

  return (
    <div id='features-settings-presentation-notificationdevicetogglesection-div-4-4t0k8z' className="space-y-4">
      {state.permissionBlocked ? (
        <div id='features-settings-presentation-notificationdevicetogglesection-div-5-gajt70' className="space-y-3">
          <div id='features-settings-presentation-notificationdevicetogglesection-div-6-fyflvl'
            className={cn(
              "grid gap-2",
              state.canOpenSettings && "sm:grid-cols-2",
            )}
          >
            <button id="features-settings-presentation-notificationdevicetogglesection-button-7-scvndn"
              type="button"
              disabled={state.deviceBusy}
              onClick={() => void state.recheckPermission()}
              className="asol-control w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
            >
              {state.t("notifications.permissionPrompt.recheck")}
            </button>
            {state.canOpenSettings ? (
              <button id='features-settings-presentation-notificationdevicetogglesection-button-8-hhya8f'
                type="button"
                disabled={state.deviceBusy}
                onClick={() => void state.openNotificationSettings()}
                className="asol-control w-full rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface disabled:opacity-60"
              >
                {state.t("notifications.permissionPrompt.openSettings")}
              </button>
            ) : null}
          </div>
          <p id='features-settings-presentation-notificationdevicetogglesection-text-9-wydye7' className="rounded-lg bg-error/10 px-3 py-2 text-xs leading-relaxed text-error">
            {state.blockedNotice(state.canOpenSettings)}
          </p>
        </div>
      ) : (
        <SettingsToggleRow id='features-settings-presentation-notificationdevicetogglesection-settingstogglerow-10-b37r5p'
          emphasised
          title={state.t("notifications.deviceCard.toggleTitle")}
          description={state.t("notifications.deviceCard.toggleDescription")}
          checked={state.deviceEnabled}
          disabled={toggleUnavailable}
          onChange={(enabled) => void state.updateDeviceNotifications(enabled)}
        />
      )}

      {!state.permissionBlocked && !state.pushSupported ? (
        <p id='features-settings-presentation-notificationdevicetogglesection-text-11-zvbtpw' className="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface-variant">
          {state.t("notifications.deviceCard.pushUnsupported")}
        </p>
      ) : null}

      {state.permissionNotice ? (
        <p id='features-settings-presentation-notificationdevicetogglesection-text-12-dsueqj'
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
