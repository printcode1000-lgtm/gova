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
const notificationOptIn = source('src/features/notifications/presentation/NotificationOptInController.tsx');

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
assert.match(notificationOptIn, /AUTH_LOGIN_COMPLETED_EVENT/);
assert.match(notificationOptIn, /POST_LOGIN_PROMPT_DELAY_MS = 4_200/);

console.log('Registration success flow tests passed.');