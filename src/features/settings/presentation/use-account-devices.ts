"use client";

import type { AccountDeviceSummary } from "@asol/notifications-core";
import * as React from "react";

import { useSession } from "@/features/auth/components/SessionProvider";
import { notifications } from "@/features/notifications";
import { useTranslation } from "@/lib/i18n";

import type { ShowSettingsStatus } from "./use-settings-status-banner";

/**
 * Every device registered on the account, and revoking one of them.
 *
 * Revoking the device the user is holding takes the local path
 * (`unregisterDevice`), because dropping the server row alone would leave this
 * browser with a live Web Push subscription and a stored native flag that both
 * claim a registration the server no longer has.
 */
export function useAccountDevices(
  showStatus: ShowSettingsStatus,
  refreshDeviceState: () => Promise<void>,
  deviceEnabled: boolean,
) {
  const { t } = useTranslation();
  const { session } = useSession();
  const [accountDevices, setAccountDevices] = React.useState<
    AccountDeviceSummary[]
  >([]);
  const [localDeviceIds, setLocalDeviceIds] = React.useState<readonly string[]>(
    [],
  );
  const [accountDevicesLoading, setAccountDevicesLoading] =
    React.useState(false);
  const [accountDevicesFailed, setAccountDevicesFailed] = React.useState(false);
  const [revokingDeviceId, setRevokingDeviceId] = React.useState("");

  const accountDevicesAvailable = Boolean(session?.sessionToken);

  const refreshAccountDevices = React.useCallback(async () => {
    if (!session?.sessionToken || !session.uid) return;
    setAccountDevicesLoading(true);
    try {
      const [account, local] = await Promise.all([
        notifications.listAccountDevices({ sessionToken: session.sessionToken }),
        notifications.listDevices({ uid: session.uid }),
      ]);
      setAccountDevices(account.devices);
      setLocalDeviceIds(local.map((token) => token.deviceId));
      setAccountDevicesFailed(false);
    } catch {
      setAccountDevicesFailed(true);
    } finally {
      setAccountDevicesLoading(false);
    }
  }, [session]);

  // Enabling or disabling this device changes the account's list, and the
  // switch is the only other control that can.
  React.useEffect(() => {
    void refreshAccountDevices();
  }, [deviceEnabled, refreshAccountDevices]);

  const revokeAccountDevice = React.useCallback(
    async (deviceId: string) => {
      if (!session?.sessionToken || !session.uid || revokingDeviceId) return;
      setRevokingDeviceId(deviceId);
      try {
        if (localDeviceIds.includes(deviceId)) {
          await notifications.unregisterDevice({
            uid: session.uid,
            phone: session.phone,
          });
          await refreshDeviceState();
        } else {
          await notifications.revokeAccountDevice({
            sessionToken: session.sessionToken,
            deviceId,
          });
        }
        await refreshAccountDevices();
        showStatus(t("notifications.accountDevices.revoked"));
      } catch (error) {
        showStatus(
          error instanceof Error
            ? error.message
            : t("notifications.accountDevices.revokeError"),
          "error",
        );
      } finally {
        setRevokingDeviceId("");
      }
    },
    [
      localDeviceIds,
      refreshAccountDevices,
      refreshDeviceState,
      revokingDeviceId,
      session,
      showStatus,
      t,
    ],
  );

  return {
    accountDevices,
    accountDevicesAvailable,
    accountDevicesFailed,
    accountDevicesLoading,
    localDeviceIds,
    refreshAccountDevices,
    revokeAccountDevice,
    revokingDeviceId,
  };
}
