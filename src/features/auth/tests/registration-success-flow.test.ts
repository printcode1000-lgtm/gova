import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const login = source('src/features/auth/presentation/hooks/use-login.ts');
const loginPage = source('src/features/auth/presentation/LoginPageContent.tsx');
const registration = source('src/features/auth/presentation/hooks/use-register.ts');
const registrationPage = source('src/features/auth/presentation/RegistrationPageContent.tsx');
const toast = source('src/features/auth/presentation/LoginSuccessToast.tsx');
const rootLayout = source('src/app/layout.tsx');
const notificationBridge = source('src/core/composition/NotificationsFeatureBridge.tsx');
const notificationOptIn = source(
  'src/features/notifications/presentation/NotificationOptInController.tsx',
);

for (const hook of [login, registration]) {
  assert.match(hook, /announceAuthLoginCompleted\(\{ uid: session\.uid, phone: session\.phone \}\)/);
  assert.match(hook, /router\.replace\('\/home'\)/);
}

assert.doesNotMatch(loginPage, /if \(submitted\)/);
assert.doesNotMatch(loginPage, /continueToApp/);
assert.doesNotMatch(loginPage, /handleContinue/);
assert.doesNotMatch(login, /submitted: mutation\.isSuccess/);
assert.match(registration, /queueRegistrationSuccessToast\(\)/);
assert.doesNotMatch(registrationPage, /if \(submitted\)/);
assert.doesNotMatch(registrationPage, /continueToApp/);
assert.doesNotMatch(registrationPage, /handleContinue/);
assert.match(toast, /kind === "registration"/);
assert.match(toast, /t\("auth\.registration\.successMessage"\)/);
// Notifications must not import auth: the composition bridge listens for the
// login-completed event and passes loginCompleted through NotificationRuntimeProvider.
assert.match(notificationBridge, /AUTH_LOGIN_COMPLETED_EVENT/);
assert.match(notificationBridge, /setLoginCompleted/);
const preferencesProviderStart = rootLayout.indexOf('<PreferencesProvider>');
const notificationBridgeStart = rootLayout.indexOf('<NotificationsFeatureBridge>');
const notificationBridgeEnd = rootLayout.indexOf('</NotificationsFeatureBridge>');
const preferencesProviderEnd = rootLayout.indexOf('</PreferencesProvider>');
assert.ok(preferencesProviderStart >= 0, 'Root layout must mount PreferencesProvider');
assert.ok(notificationBridgeStart >= 0, 'Root layout must mount NotificationsFeatureBridge');
assert.ok(
  preferencesProviderStart < notificationBridgeStart &&
    notificationBridgeEnd < preferencesProviderEnd,
  'PreferencesProvider must wrap NotificationsFeatureBridge because notification prompts use the locale runtime',
);
assert.match(notificationOptIn, /loginCompleted/);
assert.match(notificationOptIn, /POST_LOGIN_PROMPT_DELAY_MS = 4_200/);
assert.doesNotMatch(
  notificationOptIn,
  /AUTH_LOGIN_COMPLETED_EVENT/,
  'NotificationOptInController must receive loginCompleted via the composition bridge, not listen to auth events directly',
);

console.log('Registration success flow tests passed.');
