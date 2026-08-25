"use client";

import { formatDateTime } from "@asol/format-core";
import { RefreshCw, Trash2 } from "lucide-react";

import { Skeleton } from "@/shared/ui/skeleton";

import {
  accountDevicePlatformKey,
  sortAccountDevices,
} from "./account-devices-model";
import type { NotificationDeviceSettingsCardState } from "./use-notification-device-settings-card";

/**
 * Every device registered on the account, with a way to revoke one.
 *
 * The per-device switch above covers only the device in the user's hand; a lost
 * or replaced handset can be signed in and receiving with no control anywhere
 * else in the app to stop it.
 */
export function AccountDevicesSection({
  state,
}: {
  state: NotificationDeviceSettingsCardState;
}) {
  if (!state.accountDevicesAvailable) return null;

  const devices = sortAccountDevices(
    state.accountDevices,
    state.localDeviceIds,
  );

  return (
    <div className="space-y-3 rounded-xl border border-outline-variant bg-surface p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-on-surface">
            {state.t("notifications.accountDevices.title")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            {state.t("notifications.accountDevices.description")}
          </p>
        </div>
        <button
          type="button"
          disabled={state.accountDevicesLoading}
          onClick={() => void state.refreshAccountDevices()}
          aria-label={state.t("notifications.accountDevices.refresh")}
          className="asol-control flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant text-on-surface active:opacity-80 disabled:opacity-60"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {state.accountDevicesLoading && devices.length === 0 ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : state.accountDevicesFailed ? (
        <p className="rounded-lg bg-error/10 px-3 py-2 text-xs leading-relaxed text-error">
          {state.t("notifications.accountDevices.loadError")}
        </p>
      ) : devices.length === 0 ? (
        <p className="rounded-lg bg-surface-variant px-3 py-2 text-xs leading-relaxed text-on-surface-variant">
          {state.t("notifications.accountDevices.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {devices.map((device) => {
            const isThisDevice = state.localDeviceIds.includes(device.deviceId);
            return (
              <li
                key={device.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-on-surface">
                    {state.t(accountDevicePlatformKey(device))}
                    {isThisDevice
                      ? ` — ${state.t("notifications.accountDevices.thisDevice")}`
                      : ""}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-on-surface-variant">
                    {state.t("notifications.accountDevices.lastSeen", {
                      at: formatDateTime(
                        device.lastSeenAt ?? device.updatedAt,
                        state.locale,
                      ),
                    })}
                  </p>
                </div>
                <button
                  data-simulation-list-item="notifications-revoke-device"
                  type="button"
                  disabled={state.revokingDeviceId === device.deviceId}
                  onClick={() => void state.revokeAccountDevice(device.deviceId)}
                  aria-label={state.t("notifications.accountDevices.revoke")}
                  className="asol-control flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-error/40 text-error active:opacity-80 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
