import assert from 'node:assert/strict';

import { isExpectedNetworkCheckAbort } from './network-check-error';

assert.equal(isExpectedNetworkCheckAbort(new DOMException('cancelled', 'AbortError')), true);
assert.equal(isExpectedNetworkCheckAbort(Object.assign(new Error('cancelled'), { name: 'AbortError' })), true);
assert.equal(isExpectedNetworkCheckAbort(new Error('network failed')), false);
assert.equal(isExpectedNetworkCheckAbort(null), false);

console.log('Network check abort classification tests passed.');
