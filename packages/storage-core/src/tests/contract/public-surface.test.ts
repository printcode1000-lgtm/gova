import assert from 'node:assert/strict';
import * as runtimeApi from '../../index';
import * as serverApi from '../../server';

export function runPublicSurfaceTest() {
  // Check runtime exports
  assert.ok(typeof runtimeApi.getStorageAccount === 'function');
  assert.ok(typeof runtimeApi.validateStorageProfilesFile === 'function');
  assert.ok(typeof runtimeApi.validateImageForProfile === 'function');
  assert.ok(typeof runtimeApi.buildObjectPath === 'function');

  // Check server exports
  assert.ok(typeof serverApi.uploadR2Object === 'function');
  assert.ok(typeof serverApi.deleteR2Object === 'function');
  assert.ok(typeof serverApi.r2ObjectExists === 'function');
  assert.ok(typeof serverApi.resolveStorageProvider === 'function');
  assert.ok(typeof serverApi.imageStorageOrchestrator === 'object');

  console.log('✅ Contract test: public surface passed');
}
