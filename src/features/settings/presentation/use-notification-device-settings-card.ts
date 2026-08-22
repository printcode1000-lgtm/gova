"use client";

import { useSession } from "@/features/auth/components/SessionProvider";
import { useTranslation } from "@/lib/i18n";

import { useAccountDevices } from "./use-account-devices";
import { useChatMessagePreferences } from "./use-chat-message-preferences";
import { useNotificationDeviceToggle } from "./use-notification-device-toggle";
import { useSelfTestNotification } from "./use-self-test-notification";
import { useSettingsStatusBanner } from "./use-settings-status-banner";
import { useSystemNotificationSettings } from "./use-system-notification-settings";

/**
 * Composes the card's concerns — the shared status line, this device's push
 * state, the system settings shortcut, the account's other devices, its
 * delivery test, and its chat preferences — into one view model.
 */
export function useNotificationDeviceSettingsCard() {
  const { t, locale } = useTranslation();
  const { session } = useSession();
  const { statusText, statusTone, showStatus } = useSettingsStatusBanner();
  const device = useNotificationDeviceToggle(showStatus);
  const chat = useChatMessagePreferences(showStatus);
  const systemSettings = useSystemNotificationSettings(showStatus);
  const accountDevices = useAccountDevices(
    showStatus,
    device.refreshDeviceState,
    device.deviceEnabled,
  );
  const selfTest = useSelfTestNotification(showStatus);

  return {
    ...device,
    ...chat,
    ...systemSettings,
    ...accountDevices,
    ...selfTest,
    locale,
    session,
    statusText,
    statusTone,
    t,
  };
}

export type NotificationDeviceSettingsCardState = ReturnType<
  typeof useNotificationDeviceSettingsCard
>;
