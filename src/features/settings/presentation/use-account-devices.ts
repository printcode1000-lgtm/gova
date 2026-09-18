"use client";

import type { AccountDeviceSummary } from "@asol/notifications-core";
import * as React from "react";

import { useSession } from "@/features/auth/ui";
import { notifications } from "@/features/notifications";
import { useTranslation } from "@/shared/i18n";

import { confirmedLocalDeviceIds } from "./notification-registration-confirmation";
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

  const sessionToken = session?.sessionToken ?? "";
  const sessionUid = session?.uid ?? "";
  const sessionPhone = session?.phone ?? "";
  const accountDevicesAvailable = Boolean(
    sessionToken && sessionUid && sessionPhone,
  );

  const refreshAccountDevices = React.useCallback(async () => {
    if (!sessionToken || !sessionUid || !sessionPhone) return;
    setAccountDevicesLoading(true);
    try {
      let [account, local] = await Promise.all([
        notifications.listAccountDevices({ sessionToken }),
        notifications.listDevices({ uid: sessionUid }),
      ]);

      // A native permission can outlive both the local token and the server row.
      // The device-state hook performs the repair first; this hook independently
      // proves that the resulting local token is visible on the server.
      if (deviceEnabled) {
        const hasConfirmedLocalRegistration =
          confirmedLocalDeviceIds(account.devices, local).length > 0;
        // Reconcile every unconfirmed enabled device, including legacy states
        // whose local token cache is empty.
        if (!hasConfirmedLocalRegistration) {
          await notifications.reconcileDevice({
            uid: sessionUid,
            phone: sessionPhone,
          });
          [account, local] = await Promise.all([
            notifications.listAccountDevices({ sessionToken }),
            notifications.listDevices({ uid: sessionUid }),
          ]);
        }
      }

      const confirmedLocalIds = confirmedLocalDeviceIds(account.devices, local);
      if (deviceEnabled && confirmedLocalIds.length === 0) {
        throw new Error("notificationRegistrationNotConfirmed");
      }

      setAccountDevices(account.devices);
      setLocalDeviceIds(confirmedLocalIds);
      setAccountDevicesFailed(false);
    } catch {
      setAccountDevices([]);
      setLocalDeviceIds([]);
      setAccountDevicesFailed(true);
    } finally {
      setAccountDevicesLoading(false);
    }
  }, [deviceEnabled, sessionPhone, sessionToken, sessionUid]);

  // Enabling or disabling this device changes the account's list, and the
  // switch is the only other control that can.
  React.useEffect(() => {
    if (!accountDevicesAvailable) {
      setAccountDevices([]);
      setLocalDeviceIds([]);
      setAccountDevicesFailed(false);
      return;
    }
    void refreshAccountDevices();
  }, [accountDevicesAvailable, deviceEnabled, refreshAccountDevices]);

  const revokeAccountDevice = React.useCallback(
    async (deviceId: string) => {
      if (!sessionToken || !sessionUid || !sessionPhone || revokingDeviceId) return;
      setRevokingDeviceId(deviceId);
      try {
        if (localDeviceIds.includes(deviceId)) {
          await notifications.unregisterDevice({
            uid: sessionUid,
            phone: sessionPhone,
          });
          await refreshDeviceState();
        } else {
          await notifications.revokeAccountDevice({
            sessionToken,
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
      sessionPhone,
      sessionToken,
      sessionUid,
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
