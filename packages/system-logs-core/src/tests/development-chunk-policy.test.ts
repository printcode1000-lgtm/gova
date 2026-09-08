import assert from 'node:assert/strict';

import {
  isExpectedDevelopmentChunkFailure,
  isExpectedDevelopmentRscReloadFailure,
} from '../browser/development-chunk-policy';

const origin = 'http://localhost:3001';

export function runDevelopmentChunkPolicyTest() {
  assert.equal(
    isExpectedDevelopmentChunkFailure({
      developmentBuild: true,
      currentOrigin: origin,
      resourceUrl: `${origin}/_next/static/chunks/example.js`,
    }),
    true,
  );
  assert.equal(
    isExpectedDevelopmentChunkFailure({
      developmentBuild: true,
      currentOrigin: origin,
      message: 'ChunkLoadError: Failed to load chunk /_next/static/chunks/example.js',
      errorName: 'ChunkLoadError',
    }),
    true,
  );
  assert.equal(
    isExpectedDevelopmentChunkFailure({
      developmentBuild: false,
      currentOrigin: origin,
      resourceUrl: `${origin}/_next/static/chunks/example.js`,
    }),
    false,
  );
  assert.equal(
    isExpectedDevelopmentChunkFailure({
      developmentBuild: true,
      currentOrigin: origin,
      resourceUrl: 'https://other.example/_next/static/chunks/example.js',
    }),
    false,
  );
  assert.equal(
    isExpectedDevelopmentChunkFailure({
      developmentBuild: true,
      currentOrigin: origin,
      resourceUrl: `${origin}/assets/app.js`,
    }),
    false,
  );
  assert.equal(
    isExpectedDevelopmentRscReloadFailure({
      developmentBuild: true,
      currentOrigin: origin,
      message:
        'Failed to fetch RSC payload for http://localhost:3001/home. Falling back to browser navigation. TypeError: Failed to fetch',
      errorName: 'TypeError',
    }),
    true,
  );
  assert.equal(
    isExpectedDevelopmentRscReloadFailure({
      developmentBuild: false,
      currentOrigin: origin,
      message:
        'Failed to fetch RSC payload for http://localhost:3001/home. Falling back to browser navigation. TypeError: Failed to fetch',
      errorName: 'TypeError',
    }),
    false,
  );
  assert.equal(
    isExpectedDevelopmentRscReloadFailure({
      developmentBuild: true,
      currentOrigin: origin,
      message:
        'Failed to fetch RSC payload for https://other.example/home. Falling back to browser navigation. TypeError: Failed to fetch',
      errorName: 'TypeError',
    }),
    false,
  );
  console.log('✅ system-logs-core development chunk policy test passed');
}
