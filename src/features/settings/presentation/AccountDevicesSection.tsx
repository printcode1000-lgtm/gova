"use client";

import { formatDateTime } from "@asol/format-core";
import { RefreshCw, Trash2 } from "lucide-react";

import { Skeleton } from "@/shared/ui/skeleton";

import {
  accountDevicePlatformKey,
  sortAccountDevices,
} from "./account-devices-model";
import type { NotificationDeviceSettingsCardState } from "./use-notification-device-settings-card";
import { uiAttributes } from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "settings.account-devices-section.div.5-cZOh1X", id: "settings.account-devices-section.div.5" })} id="settings.account-devices-section.div" className="space-y-3 rounded-xl border border-outline-variant bg-surface p-3 sm:p-4">
      <div {...uiAttributes({ uid: "settings.account-devices-section.div.6-8GQMNW", id: "settings.account-devices-section.div.6" })} id="settings.account-devices-section.div.2" className="flex items-center justify-between gap-3">
        <div {...uiAttributes({ uid: "settings.account-devices-section.div.7-KTN5Wn", id: "settings.account-devices-section.div.7" })} id="settings.account-devices-section.div.3" className="min-w-0">
          <p {...uiAttributes({ uid: "settings.account-devices-section.p.4-TX375t", id: "settings.account-devices-section.p.4" })} id="settings.account-devices-section.p" className="text-sm font-semibold text-on-surface">
            {state.t("notifications.accountDevices.title")}
          </p>
          <p {...uiAttributes({ uid: "settings.account-devices-section.p.5-13BGmq", id: "settings.account-devices-section.p.5" })} id="settings.account-devices-section.p.2" className="mt-1 text-xs leading-relaxed text-on-surface-variant">
            {state.t("notifications.accountDevices.description")}
          </p>
        </div>
        <button {...uiAttributes({ uid: "settings.account-devices-section.button.2-6f41Xs", id: "settings.account-devices-section.button.2" })} id="settings.account-devices-section.button"
          type="button"
          disabled={state.accountDevicesLoading}
          onClick={() => void state.refreshAccountDevices()}
          aria-label={state.t("notifications.accountDevices.refresh")}
          className="asol-control flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant text-on-surface active:opacity-80 disabled:opacity-60"
        >
          <RefreshCw id="settings.account-devices-section.refresh-cw" className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {state.accountDevicesLoading && devices.length === 0 ? (
        <div {...uiAttributes({ uid: "settings.account-devices-section.div.8-78K0XF", id: "settings.account-devices-section.div.8" })} id="settings.account-devices-section.div.4" className="space-y-2" aria-busy="true">
          <Skeleton id="settings.account-devices-section.skeleton" className="h-14 w-full rounded-xl" />
          <Skeleton id="settings.account-devices-section.skeleton.2" className="h-14 w-full rounded-xl" />
        </div>
      ) : state.accountDevicesFailed ? (
        <p {...uiAttributes({ uid: "settings.account-devices-section.p.6-ugEo1y", id: "settings.account-devices-section.p.6" })} id="settings.account-devices-section.p.3" className="rounded-lg bg-error/10 px-3 py-2 text-xs leading-relaxed text-error">
          {state.t("notifications.accountDevices.loadError")}
        </p>
      ) : devices.length === 0 ? (
        <p {...uiAttributes({ uid: "account-devices-empty-RP4KoU", id: "account-devices-empty", kind: "region", simulation: { kind: "state", id: "account-devices-empty" } })} className="rounded-lg bg-surface-variant px-3 py-2 text-xs leading-relaxed text-on-surface-variant">
          {state.t("notifications.accountDevices.empty")}
        </p>
      ) : (
        <ul {...uiAttributes({ uid: "settings.account-devices-section.ul.2-2VLIC4", id: "settings.account-devices-section.ul.2" })} id="settings.account-devices-section.ul" className="space-y-2">
          {devices.map((device) => {
            const isThisDevice = state.localDeviceIds.includes(device.deviceId);
            return (
              <li
                key={device.id} {...uiAttributes({ uid: "settings.account-devices-section.li-NA9EPm", id: "settings.account-devices-section.li" })}
                className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant p-3"
              >
                <div {...uiAttributes({ uid: "settings.account-devices-section.div.9-SnC1Rp", id: "settings.account-devices-section.div.9" })} className="min-w-0">
                  <p {...uiAttributes({ uid: "settings.account-devices-section.p.7-0CNeO9", id: "settings.account-devices-section.p.7" })} className="truncate text-sm font-semibold text-on-surface">
                    {state.t(accountDevicePlatformKey(device))}
                    {isThisDevice
                      ? ` — ${state.t("notifications.accountDevices.thisDevice")}`
                      : ""}
                  </p>
                  <p {...uiAttributes({ uid: "settings.account-devices-section.p.8-JpV5NK", id: "settings.account-devices-section.p.8" })} className="mt-0.5 truncate text-xs text-on-surface-variant">
                    {state.t("notifications.accountDevices.lastSeen", {
                      at: formatDateTime(
                        device.lastSeenAt ?? device.updatedAt,
                        state.locale,
                      ),
                    })}
                  </p>
                </div>
                <button {...uiAttributes({ uid: "notifications-revoke-device-H2bryb", id: "notifications-revoke-device", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "notifications-revoke-device" } })}
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
