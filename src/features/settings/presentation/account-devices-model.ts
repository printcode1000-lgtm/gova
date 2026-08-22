import type { AccountDeviceSummary } from "@asol/notifications-core";

/** The platform label key for one registration. */
export function accountDevicePlatformKey(device: AccountDeviceSummary): string {
  return device.platform === "android"
    ? "notifications.accountDevices.platformAndroid"
    : device.platform === "ios"
      ? "notifications.accountDevices.platformIos"
      : "notifications.accountDevices.platformWeb";
}

/**
 * Newest first, and this device first of all.
 *
 * A user scanning the list for something to revoke needs to recognise their own
 * device before anything else, and every other row is easier to place by how
 * recently it was seen.
 */
export function sortAccountDevices(
  devices: readonly AccountDeviceSummary[],
  localDeviceIds: readonly string[],
): AccountDeviceSummary[] {
  return [...devices].sort((left, right) => {
    const leftIsLocal = localDeviceIds.includes(left.deviceId);
    const rightIsLocal = localDeviceIds.includes(right.deviceId);
    if (leftIsLocal !== rightIsLocal) return leftIsLocal ? -1 : 1;
    return (right.lastSeenAt ?? right.updatedAt).localeCompare(
      left.lastSeenAt ?? left.updatedAt,
    );
  });
}
