/**
 * Which of this device's local registrations the server also lists.
 *
 * Both the device switch and the account device list prove "this device is
 * registered" the same way: a local, enabled token whose `deviceId` appears in
 * the server's listing. When a browser kept no local record, the proof failed
 * on every visit and the page showed "could not load the device list" while the
 * registration was fine. Keeping the rule in one pure function lets it be
 * tested against every platform's shape instead of being restated per hook.
 */
export function confirmedLocalDeviceIds(
  serverDevices: ReadonlyArray<{ deviceId: string }>,
  localTokens: ReadonlyArray<{ deviceId: string; enabled: boolean }>,
): string[] {
  const serverIds = new Set(serverDevices.map((device) => device.deviceId));
  return localTokens
    .filter((token) => token.enabled && serverIds.has(token.deviceId))
    .map((token) => token.deviceId);
}
