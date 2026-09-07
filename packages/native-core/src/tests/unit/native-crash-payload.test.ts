import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const payload = {
  name: 'NativeCrash',
  message: 'Process terminated',
  operation: 'uncaught-exception',
  stack: 'at main',
};

function validateNativeCrashDetail(detail: Record<string, unknown>) {
  assert.equal(typeof detail.name, 'string');
  assert.equal(typeof detail.message, 'string');
  assert.equal(typeof detail.operation, 'string');
  assert.ok('stack' in detail);
}

validateNativeCrashDetail(payload);

const script = `window.dispatchEvent(new CustomEvent('asol:native-crash', { detail: ${JSON.stringify(payload)} }));`;
assert.ok(script.includes('asol:native-crash'));
assert.ok(script.includes('NativeCrash'));

const iosCrashSource = readFileSync(
  'packages/native-core/ios/Sources/AsolNativeCore/NativeCrashPlugin.swift',
  'utf8',
);
assert.ok(iosCrashSource.includes('private func asolHandleUncaughtException'));
assert.ok(iosCrashSource.includes('NSSetUncaughtExceptionHandler(asolHandleUncaughtException)'));
assert.ok(!iosCrashSource.includes('NSSetUncaughtExceptionHandler {'));

console.log('✓ native crash payload contract test passed');
