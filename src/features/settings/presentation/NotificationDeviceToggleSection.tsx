"use client";

import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/utils";

import { SettingsToggleRow } from "./SettingsToggleRow";
import type { NotificationDeviceSettingsCardState } from "./use-notification-device-settings-card";
import { uiAttributes } from "@asol/ui-registry-core";

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
      <div {...uiAttributes({ uid: "settings.notification-device-toggle-section.div.5-5P26BC", id: "settings.notification-device-toggle-section.div.5" })} id="settings.notification-device-toggle-section.div" className="space-y-2" aria-busy="true">
        <Skeleton ui={{ uid: "settings.notification-device-toggle-section.skeleton.2-19h7Qg", id: "settings.notification-device-toggle-section.skeleton.2" }} id="settings.notification-device-toggle-section.skeleton" className="h-20 w-full rounded-xl" />
        <span {...uiAttributes({ uid: "settings.notification-device-toggle-section.span.2-Ra63g9", id: "settings.notification-device-toggle-section.span.2" })} id="settings.notification-device-toggle-section.span" className="sr-only">{state.t("common.loading")}</span>
      </div>
    );
  }

  const toggleUnavailable =
    !state.pushSupported || !state.session?.uid || state.deviceBusy;

  return (
    <div {...uiAttributes({ uid: "settings.notification-device-toggle-section.div.6-LFdY3r", id: "settings.notification-device-toggle-section.div.6" })} id="settings.notification-device-toggle-section.div.2" className="space-y-4">
      {state.permissionBlocked ? (
        <div {...uiAttributes({ uid: "settings.notification-device-toggle-section.div.7-5ngYAZ", id: "settings.notification-device-toggle-section.div.7" })} id="settings.notification-device-toggle-section.div.3" className="space-y-3">
          <div {...uiAttributes({ uid: "settings.notification-device-toggle-section.div.8-9Zcjg6", id: "settings.notification-device-toggle-section.div.8" })} id="settings.notification-device-toggle-section.div.4"
            className={cn(
              "grid gap-2",
              state.canOpenSettings && "sm:grid-cols-2",
            )}
          >
            <button {...uiAttributes({ uid: "notifications-permission-2Bg0Jo", id: "notifications-permission", kind: "action", action: "recheck-permission", part: "permission", interaction: { type: "tap" }, simulation: { kind: "event", id: "notifications-permission" } })}
              type="button"
              disabled={state.deviceBusy}
              onClick={() => void state.recheckPermission()}
              className="asol-control w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary disabled:opacity-60"
            >
              {state.t("notifications.permissionPrompt.recheck")}
            </button>
            {state.canOpenSettings ? (
              <button {...uiAttributes({ uid: "settings.notification-device-toggle-section.button.2-X946Bl", id: "settings.notification-device-toggle-section.button.2" })} id="settings.notification-device-toggle-section.button"
                type="button"
                disabled={state.deviceBusy}
                onClick={() => void state.openNotificationSettings()}
                className="asol-control w-full rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface disabled:opacity-60"
              >
                {state.t("notifications.permissionPrompt.openSettings")}
              </button>
            ) : null}
          </div>
          <p {...uiAttributes({ uid: "settings.notification-device-toggle-section.p.4-zhYe4m", id: "settings.notification-device-toggle-section.p.4" })} id="settings.notification-device-toggle-section.p" className="rounded-lg bg-error/10 px-3 py-2 text-xs leading-relaxed text-error">
            {state.blockedNotice(state.canOpenSettings)}
          </p>
        </div>
      ) : (
        <SettingsToggleRow ui={{ uid: "settings.notification-device-toggle-section.settings-toggle-row.2-kPpF7v", id: "settings.notification-device-toggle-section.settings-toggle-row.2", kind: "action", action: "toggle-device-notifications", part: "device" }} id="settings.notification-device-toggle-section.settings-toggle-row"
          emphasised
          title={state.t("notifications.deviceCard.toggleTitle")}
          description={state.t("notifications.deviceCard.toggleDescription")}
          checked={state.deviceEnabled}
          disabled={toggleUnavailable}
          onChange={(enabled) => void state.updateDeviceNotifications(enabled)}
        />
      )}

      {!state.permissionBlocked && !state.pushSupported ? (
        <p {...uiAttributes({ uid: "settings.notification-device-toggle-section.p.5-Ts59El", id: "settings.notification-device-toggle-section.p.5" })} id="settings.notification-device-toggle-section.p.2" className="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface-variant">
          {state.t("notifications.deviceCard.pushUnsupported")}
        </p>
      ) : null}

      {state.permissionNotice ? (
        <p {...uiAttributes({ uid: "settings.notification-device-toggle-section.p.6-5PIEzi", id: "settings.notification-device-toggle-section.p.6" })} id="settings.notification-device-toggle-section.p.3"
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
