import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const presentation = 'src/features/settings/presentation';

const banner = source(`${presentation}/use-settings-status-banner.ts`);
const deviceToggle = source(`${presentation}/use-notification-device-toggle.ts`);
const chatPreferences = source(`${presentation}/use-chat-message-preferences.ts`);
const card = source(`${presentation}/NotificationDeviceSettingsCard.tsx`);
const deviceSection = source(`${presentation}/NotificationDeviceToggleSection.tsx`);
const chatSection = source(`${presentation}/ChatMessagePreferencesSection.tsx`);
const systemSettingsButton = source(
  `${presentation}/SystemNotificationSettingsButton.tsx`,
);
const systemSettingsHook = source(
  `${presentation}/use-system-notification-settings.ts`,
);
const accountDevicesSection = source(`${presentation}/AccountDevicesSection.tsx`);
const accountDevicesHook = source(`${presentation}/use-account-devices.ts`);
const selfTestButton = source(`${presentation}/SelfTestNotificationButton.tsx`);
const selfTestHook = source(`${presentation}/use-self-test-notification.ts`);

// The status timer is owned, so a second message keeps its full duration and an
// unmount never lands a setState on a gone component.
assert.match(banner, /timerRef/);
assert.match(banner, /window\.clearTimeout/);
assert.match(banner, /React\.useEffect\(\(\) => cancelTimer, \[cancelTimer\]\)/);

// Failures are told apart from confirmations.
assert.match(banner, /SettingsStatusTone = "success" \| "error"/);
assert.match(card, /statusTone === "error"/);
assert.match(deviceSection, /permissionNoticeTone === "error"/);
assert.match(deviceToggle, /permissionNoticeTone/);

// A runtime that has not reported yet is a skeleton, not a switch that looks off.
assert.match(deviceSection, /!state\.notificationRuntimeReady/);
assert.match(deviceSection, /Skeleton/);

// A disabled switch always explains itself.
assert.match(deviceSection, /notifications\.deviceCard\.pushUnsupported/);
assert.match(chatSection, /notifications\.deviceCard\.chatPreferencesUnavailable/);
assert.match(chatPreferences, /preferencesAvailable/);

// The card composes the two sections instead of restating them.
assert.match(card, /<NotificationDeviceToggleSection state=\{state\} \/>/);
assert.match(card, /<ChatMessagePreferencesSection state=\{state\} \/>/);

// The system notification settings shortcut is native-only, and its
// availability is resolved after mount so the server never renders a control
// the client has to remove.
assert.match(systemSettingsButton, /if \(!state\.systemSettingsAvailable\) return null;/);
assert.match(systemSettingsButton, /settings\.notifications\.systemSettings\.button/);
assert.match(systemSettingsHook, /NativeCore\.canOpenAppNotificationSettings\(\)/);
assert.match(systemSettingsHook, /React\.useEffect/);
assert.match(systemSettingsHook, /NativeCore\.openAppNotificationSettings\(\)/);
assert.match(card, /<SystemNotificationSettingsButton state=\{state\} \/>/);

// The account's other devices are listed and revocable, and revoking the
// device in hand goes through the local unregister so no stale subscription
// outlives the server row.
assert.match(accountDevicesHook, /notifications\.listAccountDevices/);
assert.match(accountDevicesHook, /notifications\.revokeAccountDevice/);
assert.match(accountDevicesHook, /localDeviceIds\.includes\(deviceId\)/);
assert.match(accountDevicesHook, /notifications\.unregisterDevice/);
assert.match(accountDevicesSection, /notifications\.accountDevices\.thisDevice/);
assert.match(accountDevicesSection, /notifications\.accountDevices\.empty/);
assert.match(card, /<AccountDevicesSection state=\{state\} \/>/);

// The delivery test reports what happened, not that the request succeeded.
assert.match(selfTestHook, /notifications\.sendSelfTest/);
assert.match(selfTestHook, /outcome\.tokenCount === 0/);
assert.match(selfTestHook, /notifications\.selfTest\.noDevices/);
assert.match(selfTestButton, /notifications\.selfTest\.button/);
assert.match(card, /<SelfTestNotificationButton state=\{state\} \/>/);

// Every new string exists in both locales.
const locales = ['src/shared/locales/ar.json', 'src/shared/locales/en.json'].map(
  (file) => JSON.parse(source(file)) as Record<string, string>,
);
for (const key of [
  'notifications.deviceCard.pushUnsupported',
  'notifications.deviceCard.chatPreferencesUnavailable',
  'settings.notifications.title',
  'settings.notifications.systemSettings.title',
  'settings.notifications.systemSettings.description',
  'settings.notifications.systemSettings.button',
  'settings.notifications.systemSettings.error',
  'notifications.accountDevices.title',
  'notifications.accountDevices.description',
  'notifications.accountDevices.thisDevice',
  'notifications.accountDevices.lastSeen',
  'notifications.accountDevices.platformAndroid',
  'notifications.accountDevices.platformIos',
  'notifications.accountDevices.platformWeb',
  'notifications.accountDevices.refresh',
  'notifications.accountDevices.revoke',
  'notifications.accountDevices.revoked',
  'notifications.accountDevices.revokeError',
  'notifications.accountDevices.loadError',
  'notifications.accountDevices.empty',
  'notifications.selfTest.title',
  'notifications.selfTest.description',
  'notifications.selfTest.button',
  'notifications.selfTest.sending',
  'notifications.selfTest.sent',
  'notifications.selfTest.noDevices',
  'notifications.selfTest.failed',
]) {
  for (const locale of locales) {
    assert.ok(locale[key], `Missing translation: ${key}`);
  }
}

console.log('Notifications settings surface tests passed.');
