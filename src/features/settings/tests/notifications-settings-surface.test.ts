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
const deviceTokenService = source(
  'src/features/notifications/application/device-token-service.ts',
);

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
// Native UI state is verified by an actual re-registration. A stale local flag
// cannot paint the switch enabled when FCM is absent from the server.
assert.match(deviceToggle, /setNotificationRuntimeReady\(false\)/);
assert.match(deviceToggle, /catch \(error\)[\s\S]{0,100}setNotificationRuntimeReady\(true\)/);
assert.match(deviceToggle, /getDiagnostics\(\{ uid: sessionUid \}\)/);
assert.match(deviceToggle, /loadNotificationState\(\)\.catch/);
assert.match(deviceToggle, /nativePlatform \? false : diagnostics\.deviceEnabled/);
assert.match(deviceToggle, /verifiedDeviceEnabled/);
assert.match(deviceToggle, /notifications\.reconcileDevice/);
assert.match(deviceToggle, /notifications\.listAccountDevices/);
assert.match(deviceToggle, /device\.deviceId === repaired\.deviceId/);
assert.match(deviceToggle, /sessionToken/);
assert.match(deviceToggle, /nativePlatform &&[\s\S]{0,180}sessionToken/);
assert.match(deviceToggle, /!sessionUid \|\| !sessionPhone \|\| !sessionToken/);
assert.doesNotMatch(
  deviceToggle,
  /diagnostics\.deviceEnabled &&[\s\S]{0,250}notifications\.reconcileDevice/,
);
assert.match(deviceToggle, /verifiedDeviceEnabled = false/);
assert.match(deviceToggle, /setDeviceEnabled\(verifiedDeviceEnabled\)/);
assert.match(deviceToggle, /setDeviceEnabled\(false\);[\s\S]{0,120}getPermissionState/);
assert.match(deviceToggle, /registrationConfirmed/);
assert.match(deviceToggle, /setDeviceEnabled\(true\)/);
assert.match(deviceToggle, /catch \(error\) \{\n        setDeviceEnabled\(false\)/);
// Both hooks prove registration through the one shared rule, which
// notification-registration-confirmation.test.ts exercises per platform.
assert.match(deviceToggle, /confirmedLocalDeviceIds\(account\.devices, local\)/);
assert.match(accountDevicesHookSource(), /confirmedLocalDeviceIds\(account\.devices, local\)/);

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
assert.match(accountDevicesHook, /sessionToken && sessionUid && sessionPhone/);
assert.match(accountDevicesHook, /if \(!accountDevicesAvailable\)/);
assert.match(accountDevicesHook, /notifications\.listAccountDevices/);
assert.match(accountDevicesHook, /notifications\.revokeAccountDevice/);
assert.match(accountDevicesHook, /localDeviceIds\.includes\(deviceId\)/);
assert.match(accountDevicesHook, /notifications\.unregisterDevice/);
// An enabled native flag is never enough: if no local token is confirmed by
// the server, settings must reconcile even when the local token cache is empty.
assert.match(accountDevicesHook, /!sessionToken \|\| !sessionUid \|\| !sessionPhone/);
assert.match(accountDevicesHook, /if \(deviceEnabled\)/);
assert.match(accountDevicesHook, /hasConfirmedLocalRegistration/);
assert.match(accountDevicesHook, /if \(!hasConfirmedLocalRegistration\)/);
assert.match(accountDevicesHook, /notifications\.reconcileDevice/);
assert.doesNotMatch(accountDevicesHook, /deviceEnabled && local\.length > 0/);
assert.match(accountDevicesHook, /confirmedLocalIds/);
assert.match(accountDevicesHook, /notificationRegistrationNotConfirmed/);
assert.match(accountDevicesHook, /setLocalDeviceIds\(\[\]\)/);
// A failed server registration must not leave a locally cached token that makes
// the next render look healthy. Server acceptance precedes the local save.
const serverRegistrationIndex = deviceTokenService.indexOf(
  'await notificationApiService.registerToken',
);
const localTokenSaveIndex = deviceTokenService.indexOf(
  'await asolNotificationRepository.saveDeviceToken(token)',
);
assert.ok(serverRegistrationIndex >= 0 && localTokenSaveIndex >= 0);
assert.ok(serverRegistrationIndex < localTokenSaveIndex);
assert.match(deviceTokenService, /catch \(error\)[\s\S]*await nativePushService\.unregister\(\)/);
assert.match(deviceTokenService, /Failed push registration could not be rolled back locally/);
assert.match(deviceTokenService, /Reconciliation is explicit repair/);
assert.doesNotMatch(deviceTokenService, /reconcile[\s\S]{0,500}isEnabled\(\)/);
assert.match(deviceTokenService, /Repair must fail closed too/);
assert.match(deviceTokenService, /await asolNotificationRepository\.removeDeviceToken/);
assert.match(accountDevicesSection, /notifications\.accountDevices\.thisDevice/);
assert.match(accountDevicesSection, /notifications\.accountDevices\.empty/);
assert.match(card, /<AccountDevicesSection state=\{state\} \/>/);

// The delivery test reports what happened, not that the request succeeded.
assert.match(selfTestHook, /notifications\.sendSelfTest/);
assert.match(selfTestHook, /outcome\.tokenCount === 0/);
assert.match(selfTestHook, /notifications\.selfTest\.noDevices/);
// A grant the bridge never carried is not the same failure as a refused push.
assert.match(selfTestHook, /outcome\.status === "granted"/);
assert.match(selfTestHook, /notifications\.selfTest\.notDelivered/);
assert.match(selfTestButton, /notifications\.selfTest\.button/);
// It is a super-admin diagnostic, so it is never painted for anyone else.
assert.match(selfTestHook, /isSuperAdmin\(session\)/);
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
  'notifications.selfTest.notDelivered',
  'notifications.selfTest.failed',
]) {
  for (const locale of locales) {
    assert.ok(locale[key], `Missing translation: ${key}`);
  }
}

function accountDevicesHookSource(): string {
  return source('src/features/settings/presentation/use-account-devices.ts');
}

console.log('Notifications settings surface tests passed.');
