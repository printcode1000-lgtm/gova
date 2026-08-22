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
    <div className="grid gap-3">
      <SettingsToggleRow
        title={state.t("notifications.deviceCard.specialtyRequestsTitle")}
        description={state.t(
          "notifications.deviceCard.specialtyRequestsDescription",
        )}
        checked={state.specialtyRequestsEnabled}
        disabled={!state.preferencesAvailable || state.specialtyPreferenceBusy}
        onChange={(enabled) => void state.updateSpecialtyRequests(enabled)}
      />
      <SettingsToggleRow
        title={state.t("notifications.deviceCard.productConversationsTitle")}
        description={state.t(
          "notifications.deviceCard.productConversationsDescription",
        )}
        checked={state.productConversationsEnabled}
        disabled={!state.preferencesAvailable || state.productConversationsBusy}
        onChange={(enabled) => void state.updateProductConversations(enabled)}
      />
      {state.preferencesAvailable ? null : (
        <p className="rounded-lg bg-surface px-3 py-2 text-sm text-on-surface-variant">
          {state.t("notifications.deviceCard.chatPreferencesUnavailable")}
        </p>
      )}
    </div>
  );
}
