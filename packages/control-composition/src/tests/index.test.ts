import assert from 'node:assert/strict';
import { registerControlServerPorts } from '../index';
assert.equal(typeof registerControlServerPorts, 'function');
