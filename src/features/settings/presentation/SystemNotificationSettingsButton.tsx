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
    <div id="settings.system-notification-settings-button.div" className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-3 sm:p-4">
      <div id="settings.system-notification-settings-button.div.2" className="min-w-0">
        <p id="settings.system-notification-settings-button.p" className="text-sm font-semibold text-on-surface">
          {state.t("settings.notifications.systemSettings.title")}
        </p>
        <p id="settings.system-notification-settings-button.p.2" className="mt-1 text-xs leading-relaxed text-on-surface-variant">
          {state.t("settings.notifications.systemSettings.description")}
        </p>
      </div>
      <button id="settings.system-notification-settings-button.button"
        type="button"
        disabled={state.systemSettingsBusy}
        onClick={() => void state.openSystemNotificationSettings()}
        className="asol-control inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface active:opacity-80 disabled:opacity-60 sm:w-auto"
      >
        <SlidersHorizontal id="settings.system-notification-settings-button.sliders-horizontal" className="h-4 w-4" aria-hidden />
        {state.t("settings.notifications.systemSettings.button")}
      </button>
    </div>
  );
}
