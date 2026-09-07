import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SUPER_ADMIN_PHONE, SUPER_ADMIN_UID, isSuperAdmin } from '@/features/auth';

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}


const tokenFor = (uid: string) =>
  Buffer.from(JSON.stringify({ uid, phone: SUPER_ADMIN_PHONE, expiresAt: Date.now() + 60_000 })).toString('base64url') + '.signature';
const adminSession = {
  uid: SUPER_ADMIN_UID,
  phone: SUPER_ADMIN_PHONE,
  providerAccountEnabled: false,
  specialties: { main: [], sub: {} },
};
assert.equal(isSuperAdmin({ ...adminSession, sessionToken: tokenFor(SUPER_ADMIN_UID) }), true);
assert.equal(
  isSuperAdmin({ ...adminSession, sessionToken: tokenFor('usr_impersonated') }),
  false,
  'stale local super-admin identity must not override a token that belongs to another uid',
);

const usersPage = source('src/features/super-admin/presentation/SuperAdminUsersPage.tsx');
const banner = source('src/features/super-admin/presentation/SuperAdminImpersonationBanner.tsx');
const bootstrap = source('src/features/auth/presentation/AuthLoginBootstrapController.tsx');
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
