"use client";

import { Send } from "lucide-react";

import type { NotificationDeviceSettingsCardState } from "./use-notification-device-settings-card";
import { uiAttributes } from "@asol/ui-registry-core";

/** Sends this account a fixed test push, to prove delivery works end to end. */
export function SelfTestNotificationButton({
  state,
}: {
  state: NotificationDeviceSettingsCardState;
}) {
  if (!state.selfTestAvailable) return null;

  return (
    <div {...uiAttributes({ uid: "settings.self-test-notification-button.div.3-x9BF94", id: "settings.self-test-notification-button.div.3" })} id="settings.self-test-notification-button.div" className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface p-3 sm:p-4">
      <div {...uiAttributes({ uid: "settings.self-test-notification-button.div.4-MNqH5b", id: "settings.self-test-notification-button.div.4" })} id="settings.self-test-notification-button.div.2" className="min-w-0">
        <p {...uiAttributes({ uid: "settings.self-test-notification-button.p.3-Tq1mnG", id: "settings.self-test-notification-button.p.3" })} id="settings.self-test-notification-button.p" className="text-sm font-semibold text-on-surface">
          {state.t("notifications.selfTest.title")}
        </p>
        <p {...uiAttributes({ uid: "settings.self-test-notification-button.p.4-6Csd1a", id: "settings.self-test-notification-button.p.4" })} id="settings.self-test-notification-button.p.2" className="mt-1 text-xs leading-relaxed text-on-surface-variant">
          {state.t("notifications.selfTest.description")}
        </p>
      </div>
      <button {...uiAttributes({ uid: "notifications-test-R1JHBH", id: "notifications-test", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "notifications-test" } })}
        type="button"
        disabled={state.selfTestBusy}
        onClick={() => void state.sendSelfTest()}
        className="asol-control inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary active:opacity-80 disabled:opacity-60 sm:w-auto"
      >
        <Send id="settings.self-test-notification-button.send" className="h-4 w-4" aria-hidden />
        {state.selfTestBusy
          ? state.t("notifications.selfTest.sending")
          : state.t("notifications.selfTest.button")}
      </button>
    </div>
  );
}
