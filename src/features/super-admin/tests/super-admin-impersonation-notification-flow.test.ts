import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const usersPage = source('src/features/super-admin/presentation/SuperAdminUsersPage.tsx');
const banner = source('src/features/super-admin/components/SuperAdminImpersonationBanner.tsx');
const bootstrap = source('src/features/auth/components/AuthLoginBootstrapController.tsx');
const lifecycle = source('src/features/auth/application/auth-lifecycle-events.ts');
const asolDb = source('packages/data-core/src/browser/asol-db/index.ts');
const layout = source('src/app/layout.tsx');

assert.match(usersPage, /notifications\.unregisterDevice/);
assert.match(usersPage, /clearImageUploadClientState/);
assert.match(usersPage, /markPendingAuthLoginCompleted/);
assert.match(usersPage, /window\.location\.assign\("\/profile\?mode=edit"\)/);

assert.match(banner, /notifications\.unregisterDevice/);
assert.match(banner, /clearImageUploadClientState/);
assert.match(banner, /markPendingAuthLoginCompleted/);
assert.match(banner, /window\.location\.assign\("\/super-admin\/users"\)/);

assert.match(bootstrap, /consumePendingAuthLoginCompleted/);
assert.match(bootstrap, /announceAuthLoginCompleted/);
assert.match(lifecycle, /asolDbSetPendingAuthLoginCompleted/);
assert.match(lifecycle, /asolDbTakePendingAuthLoginCompleted/);
assert.match(asolDb, /pendingAuthLoginCompleted/);
assert.match(layout, /AuthLoginBootstrapController/);

console.log('Super-admin impersonation notification flow tests passed.');
