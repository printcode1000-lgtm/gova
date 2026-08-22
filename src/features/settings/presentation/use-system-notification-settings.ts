"use client";

import { NativeCore } from "@asol/native-core";
import * as React from "react";

import { useTranslation } from "@/lib/i18n";

import type { ShowSettingsStatus } from "./use-settings-status-banner";

/**
 * Opening this application's own notification settings in the operating system.
 *
 * Availability is resolved in an effect, never during render: the server has no
 * native bridge to ask, so deciding at render time would hydrate a button that
 * the client then has to remove.
 */
export function useSystemNotificationSettings(showStatus: ShowSettingsStatus) {
  const { t } = useTranslation();
  const [systemSettingsAvailable, setSystemSettingsAvailable] =
    React.useState(false);
  const [systemSettingsBusy, setSystemSettingsBusy] = React.useState(false);

  React.useEffect(() => {
    setSystemSettingsAvailable(NativeCore.canOpenAppNotificationSettings());
  }, []);

  const openSystemNotificationSettings = React.useCallback(async () => {
    if (systemSettingsBusy) return;
    setSystemSettingsBusy(true);
    try {
      const result = await NativeCore.openAppNotificationSettings();
      if (!result.ok || !result.value) {
        showStatus(t("settings.notifications.systemSettings.error"), "error");
      }
    } finally {
      setSystemSettingsBusy(false);
    }
  }, [showStatus, systemSettingsBusy, t]);

  return {
    openSystemNotificationSettings,
    systemSettingsAvailable,
    systemSettingsBusy,
  };
}
