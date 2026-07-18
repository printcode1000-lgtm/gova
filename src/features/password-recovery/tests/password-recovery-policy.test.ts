import assert from 'node:assert/strict';
import {
  maskRecoveryEmail,
  normalizeRecoveryPhone,
  PASSWORD_RECOVERY_POLICY,
} from '../password-recovery-policy';

assert.equal(normalizeRecoveryPhone('010 1234 5678'), '01012345678');
assert.throws(() => normalizeRecoveryPhone('123'), /passwordRecoveryInvalidPhone/);
assert.throws(() => normalizeRecoveryPhone(undefined), /passwordRecoveryInvalidPhone/);
assert.equal(maskRecoveryEmail('hesham.gaber1@gmail.com'), 'h********@gmail.com');
assert.equal(maskRecoveryEmail('a@domain.test'), 'a***@domain.test');
assert.equal(PASSWORD_RECOVERY_POLICY.codeTtlMs, 600_000);
assert.equal(PASSWORD_RECOVERY_POLICY.maxPhoneRequests, 3);
assert.equal(PASSWORD_RECOVERY_POLICY.maxCodeAttempts, 5);

console.log('Password recovery policy tests passed.');
