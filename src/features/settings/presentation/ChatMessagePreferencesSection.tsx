"use client";

import { SettingsToggleRow } from "./SettingsToggleRow";
import type { NotificationDeviceSettingsCardState } from "./use-notification-device-settings-card";
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "settings.chat-message-preferences-section.div.2-H00Yqd", id: "settings.chat-message-preferences-section.div.2" })} id="settings.chat-message-preferences-section.div" className="grid gap-3">
      <SettingsToggleRow id="settings.chat-message-preferences-section.settings-toggle-row"
        title={state.t("notifications.deviceCard.specialtyRequestsTitle")}
        description={state.t(
          "notifications.deviceCard.specialtyRequestsDescription",
        )}
        checked={state.specialtyRequestsEnabled}
        disabled={!state.preferencesAvailable || state.specialtyPreferenceBusy}
        onChange={(enabled) => void state.updateSpecialtyRequests(enabled)}
      />
      <SettingsToggleRow id="settings.chat-message-preferences-section.settings-toggle-row.2"
        title={state.t("notifications.deviceCard.productConversationsTitle")}
        description={state.t(
          "notifications.deviceCard.productConversationsDescription",
        )}
        checked={state.productConversationsEnabled}
        disabled={!state.preferencesAvailable || state.productConversationsBusy}
        onChange={(enabled) => void state.updateProductConversations(enabled)}
      />
      {state.preferencesAvailable ? null : (
        <p {...uiAttributes({ uid: "settings.chat-message-preferences-section.p.2-pqH2Pq", id: "settings.chat-message-preferences-section.p.2" })} id="settings.chat-message-preferences-section.p" className="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface-variant">
          {state.t("notifications.deviceCard.chatPreferencesUnavailable")}
        </p>
      )}
    </div>
  );
}
