"use client";

import { SettingsToggleRow } from "./SettingsToggleRow";
import type { NotificationDeviceSettingsCardState } from "./use-notification-device-settings-card";

/**
 * The account's chat intake preferences: who may start a conversation from a
 * specialty request or from a profile/product page.
 */
export function ChatMessagePreferencesSection({
  state,
}: {
  state: NotificationDeviceSettingsCardState;
}) {
  return (
    <div id='features-settings-presentation-chatmessagepreferencessection-div-1-gq7fng' className="grid gap-3">
      <SettingsToggleRow id='features-settings-presentation-chatmessagepreferencessection-settingstogglerow-2-p3vb4f'
        title={state.t("notifications.deviceCard.specialtyRequestsTitle")}
        description={state.t(
          "notifications.deviceCard.specialtyRequestsDescription",
        )}
        checked={state.specialtyRequestsEnabled}
        disabled={!state.preferencesAvailable || state.specialtyPreferenceBusy}
        onChange={(enabled) => void state.updateSpecialtyRequests(enabled)}
      />
      <SettingsToggleRow id='features-settings-presentation-chatmessagepreferencessection-settingstogglerow-3-zmypyr'
        title={state.t("notifications.deviceCard.productConversationsTitle")}
        description={state.t(
          "notifications.deviceCard.productConversationsDescription",
        )}
        checked={state.productConversationsEnabled}
        disabled={!state.preferencesAvailable || state.productConversationsBusy}
        onChange={(enabled) => void state.updateProductConversations(enabled)}
      />
      {state.preferencesAvailable ? null : (
        <p id='features-settings-presentation-chatmessagepreferencessection-text-4-uh8mzn' className="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface-variant">
          {state.t("notifications.deviceCard.chatPreferencesUnavailable")}
        </p>
      )}
    </div>
  );
}
