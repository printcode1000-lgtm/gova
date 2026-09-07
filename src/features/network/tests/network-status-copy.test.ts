import assert from 'node:assert/strict';

import type { AppRuntimeContext } from '@/core/config';
import {
  resolveNetworkDisplayEnvironment,
  restoredMessageKey,
  serverUnavailableMessageKey,
} from '../presentation/network-status-copy';

function runtime(
  overrides: Partial<AppRuntimeContext> = {},
): AppRuntimeContext {
  return {
    deployment: 'web-production',
    platform: 'web',
    dataSource: 'cloud',
    isDevelopment: false,
    isNative: false,
    isStatic: false,
    isProvisioning: false,
    supportsServerApi: true,
    supportsOta: false,
    ...overrides,
  };
}

assert.equal(resolveNetworkDisplayEnvironment(runtime(), true), 'development');
assert.equal(resolveNetworkDisplayEnvironment(runtime(), false), 'web');
assert.equal(
  resolveNetworkDisplayEnvironment(runtime({ isStatic: true, deployment: 'static-export' }), false),
  'static-web',
);
assert.equal(
  resolveNetworkDisplayEnvironment(
    runtime({ platform: 'android', isNative: true, isStatic: true, deployment: 'static-export' }),
    false,
  ),
  'android',
);
assert.equal(
  resolveNetworkDisplayEnvironment(
    runtime({ platform: 'ios', isNative: true, isStatic: true, deployment: 'static-export' }),
    false,
  ),
  'ios',
);

assert.equal(serverUnavailableMessageKey('development'), 'network.serverUnavailable.development');
assert.equal(serverUnavailableMessageKey('web'), 'network.serverUnavailable.web');
assert.equal(serverUnavailableMessageKey('static-web'), 'network.serverUnavailable.static');
assert.equal(serverUnavailableMessageKey('android'), 'network.serverUnavailable.android');
assert.equal(serverUnavailableMessageKey('ios'), 'network.serverUnavailable.ios');

assert.equal(restoredMessageKey('offline', 'web'), 'network.networkAndServerRestored');
assert.equal(restoredMessageKey('server-unreachable', 'development'), 'network.serverRestored.development');
assert.equal(restoredMessageKey('server-unreachable', 'android'), 'network.serverRestored');
assert.equal(restoredMessageKey('check-failed', 'ios'), 'network.checkRestored');
