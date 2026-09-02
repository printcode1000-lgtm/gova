"use client";

import { SlidersHorizontal } from "lucide-react";

import type { NotificationDeviceSettingsCardState } from "./use-notification-device-settings-card";

/**
 * Opens this application's notification settings in the operating system.
 *
 * Rendered on the native shells only: a browser has no per-app system settings
 * screen to reach, so the control would be dead there.
 */
export function SystemNotificationSettingsButton({
  state,
}: {
  state: NotificationDeviceSettingsCardState;
}) {
  if (!state.systemSettingsAvailable) return null;

  return (
    <div id='features-settings-presentation-systemnotificationsettingsbutton-div-1-ozz8uf' className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-3 sm:p-4">
      <div id='features-settings-presentation-systemnotificationsettingsbutton-div-2-b277ap' className="min-w-0">
        <p id='features-settings-presentation-systemnotificationsettingsbutton-text-3-bfd0my' className="text-sm font-semibold text-on-surface">
          {state.t("settings.notifications.systemSettings.title")}
        </p>
        <p id='features-settings-presentation-systemnotificationsettingsbutton-text-4-049en3' className="mt-1 text-xs leading-relaxed text-on-surface-variant">
          {state.t("settings.notifications.systemSettings.description")}
        </p>
      </div>
      <button id='features-settings-presentation-systemnotificationsettingsbutton-button-5-fcqqjq'
        type="button"
        disabled={state.systemSettingsBusy}
        onClick={() => void state.openSystemNotificationSettings()}
        className="asol-control inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface active:opacity-80 disabled:opacity-60 sm:w-auto"
      >
        <SlidersHorizontal id='features-settings-presentation-systemnotificationsettingsbutton-slidershorizontal-6-ubxsqm' className="h-4 w-4" aria-hidden />
        {state.t("settings.notifications.systemSettings.button")}
      </button>
    </div>
  );
}
