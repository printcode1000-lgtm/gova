import assert from 'node:assert/strict';
import {
  clearAsolQueryCache,
  invalidateAsolLocalFirstData,
  readAsolLocalFirstData,
} from './index';

export async function runLocalReadTests(): Promise<void> {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  try {
    await clearAsolQueryCache();
    let loads = 0;
    const load = async () => ({ value: ++loads });

    const first = await readAsolLocalFirstData({
      cacheKey: 'test:local-first',
      policy: 'localFirst',
      load,
    });
    const second = await readAsolLocalFirstData({
      cacheKey: 'test:local-first',
      policy: 'localFirst',
      load,
    });
    assert.equal(first.value, 1);
    assert.equal(second.value, 1);
    assert.equal(loads, 1, 'a fresh memory/local entry must suppress the second network loader');

    let authoritativeLoads = 0;
    const authoritative = async () => ({ value: ++authoritativeLoads });
    await readAsolLocalFirstData({
      cacheKey: 'test:authoritative',
      policy: 'networkAuthoritative',
      load: authoritative,
    });
    await readAsolLocalFirstData({
      cacheKey: 'test:authoritative',
      policy: 'networkAuthoritative',
      load: authoritative,
    });
    assert.equal(
      authoritativeLoads,
      2,
      'network-authoritative reads must execute a fresh loader for every call',
    );

    let concurrentLoads = 0;
    let rejectFirst: ((reason?: unknown) => void) | undefined;
    const firstConcurrent = readAsolLocalFirstData({
      cacheKey: 'test:authoritative-concurrent',
      policy: 'networkAuthoritative',
      load: async () => {
        concurrentLoads += 1;
        return new Promise<{ value: number }>((_resolve, reject) => {
          rejectFirst = reject;
        });
      },
    });
    await Promise.resolve();
    const secondConcurrent = readAsolLocalFirstData({
      cacheKey: 'test:authoritative-concurrent',
      policy: 'networkAuthoritative',
      load: async () => ({ value: ++concurrentLoads }),
    });
    assert.equal(
      concurrentLoads,
      2,
      'network-authoritative calls must not share an aborting in-flight probe',
    );
    rejectFirst?.(new DOMException('probe aborted', 'AbortError'));
    await assert.rejects(
      firstConcurrent,
      (error: unknown) => error instanceof DOMException && error.name === 'AbortError',
    );
    assert.deepEqual(await secondConcurrent, { value: 2 });

    await invalidateAsolLocalFirstData();
    const third = await readAsolLocalFirstData({
      cacheKey: 'test:local-first',
      policy: 'localFirst',
      load,
    });
    assert.equal(third.value, 2, 'mutation-style invalidation must permit the next read to refresh');
  } finally {
    await clearAsolQueryCache();
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
  console.log('data-core local-first query gate: memory hit, authoritative revalidation, invalidation passed.');
}
