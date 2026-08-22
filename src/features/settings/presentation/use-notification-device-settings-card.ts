"use client";

import { useSession } from "@/features/auth/components/SessionProvider";
import { useTranslation } from "@/lib/i18n";

import { useChatMessagePreferences } from "./use-chat-message-preferences";
import { useNotificationDeviceToggle } from "./use-notification-device-toggle";
import { useSettingsStatusBanner } from "./use-settings-status-banner";
import { useSystemNotificationSettings } from "./use-system-notification-settings";

/**
 * Composes the card's concerns — the shared status line, this device's push
 * state, the system settings shortcut, and the account's chat preferences —
 * into one view model.
 */
export function useNotificationDeviceSettingsCard() {
  const { t } = useTranslation();
  const { session } = useSession();
  const { statusText, statusTone, showStatus } = useSettingsStatusBanner();
  const device = useNotificationDeviceToggle(showStatus);
  const chat = useChatMessagePreferences(showStatus);
  const systemSettings = useSystemNotificationSettings(showStatus);

  return {
    ...device,
    ...chat,
    ...systemSettings,
    session,
    statusText,
    statusTone,
    t,
  };
}

export type NotificationDeviceSettingsCardState = ReturnType<
  typeof useNotificationDeviceSettingsCard
>;
