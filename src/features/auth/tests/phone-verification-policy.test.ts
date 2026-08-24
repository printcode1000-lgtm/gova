import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { shouldBypassPhoneVerification } from '@/features/auth/domain/phone-verification-policy';

assert.equal(shouldBypassPhoneVerification({ developmentBuild: true }), true, 'next dev must bypass phone OTP');
assert.equal(shouldBypassPhoneVerification({ developmentBuild: false }), false, 'production and static bundles must never bypass phone OTP');

const hookSource = readFileSync(
  path.join(process.cwd(), 'src/features/auth/application/hooks/use-phone-verification.ts'),
  'utf8',
);
const bypassBranch = hookSource.indexOf('if (bypassPhoneVerification)');
const phoneLookup = hookSource.indexOf('authService.checkPhone(phone)');
assert.ok(bypassBranch >= 0, 'the hook must contain an explicit development bypass');
assert.ok(phoneLookup > bypassBranch, 'the development bypass must run before the phone lookup client service');
assert.doesNotMatch(hookSource, /asolApi|ASOL_API_ROUTES/, 'hooks must not bypass the auth client service');
assert.match(hookSource, /onDevelopmentVerified\?\.\(\)/, 'the bypass must complete verification without opening the OTP flow');

console.log('Phone verification policy tests passed.');