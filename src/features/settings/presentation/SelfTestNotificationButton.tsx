"use client";

import { Send } from "lucide-react";

import type { NotificationDeviceSettingsCardState } from "./use-notification-device-settings-card";

/** Sends this account a fixed test push, to prove delivery works end to end. */
export function SelfTestNotificationButton({
  state,
}: {
  state: NotificationDeviceSettingsCardState;
}) {
  if (!state.selfTestAvailable) return null;

  return (
    <div id='features-settings-presentation-selftestnotificationbutton-div-1-jcdbnr' className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-3 sm:p-4">
      <div id='features-settings-presentation-selftestnotificationbutton-div-2-clcjse' className="min-w-0">
        <p id='features-settings-presentation-selftestnotificationbutton-text-3-ow0ip3' className="text-sm font-semibold text-on-surface">
          {state.t("notifications.selfTest.title")}
        </p>
        <p id='features-settings-presentation-selftestnotificationbutton-text-4-ix7flx' className="mt-1 text-xs leading-relaxed text-on-surface-variant">
          {state.t("notifications.selfTest.description")}
        </p>
      </div>
      <button id="features-settings-presentation-selftestnotificationbutton-button-5-0gj3mi"
        type="button"
        disabled={state.selfTestBusy}
        onClick={() => void state.sendSelfTest()}
        className="asol-control inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary active:opacity-80 disabled:opacity-60 sm:w-auto"
      >
        <Send id='features-settings-presentation-selftestnotificationbutton-send-6-tov5en' className="h-4 w-4" aria-hidden />
        {state.selfTestBusy
          ? state.t("notifications.selfTest.sending")
          : state.t("notifications.selfTest.button")}
      </button>
    </div>
  );
}
