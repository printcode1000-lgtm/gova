import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  buildAsolApiLocalReadCacheKey,
  configureAsolApiBrowserLocalReadCache,
  defaultAsolApiLocalReadPolicy,
  resetAsolApiBrowserLocalReadCacheForTests,
} from '../browser-local-read-cache';
import { AsolApiClient } from '../asol-api-client';


function sourceFiles(directory: string): string[] {
  const output: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'tests' || entry.name === '.next') continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...sourceFiles(full));
    else if (/\.(?:ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.')) output.push(full);
  }
  return output;
}

function assertNoBrowserTransportBypass(): void {
  const root = process.cwd();
  const sources = [...sourceFiles(path.join(root, 'src')), ...sourceFiles(path.join(root, 'packages'))];
  const transportImporters = sources
    .filter((file) => readFileSync(file, 'utf8').includes("@/core/api/asol-http-transport"))
    .map((file) => path.relative(root, file).split(path.sep).join('/'))
    .sort();
  assert.deepEqual(transportImporters, [
    'src/features/data/ports/data-core-runtime-config-ports.ts',
    'src/features/storage/ports/storage-core-ports.ts',
  ], 'application code may not bypass AsolApiClient; the only direct transport imports are server capability wiring');

  const binaryResponseUsers = sources
    .filter((file) => readFileSync(file, 'utf8').includes('getAbsoluteBinaryResponse('))
    .map((file) => path.relative(root, file).split(path.sep).join('/'))
    .sort();
  assert.deepEqual(binaryResponseUsers, [
    'src/core/api/asol-api-client.ts',
    'src/features/storage/application/services/storage-image-manager-browser-ports.ts',
  ], 'cloud image bytes may be requested only by the local-first storage image adapter');


  const browserRoot = readFileSync(path.join(root, 'src/core/composition/browser-ports.ts'), 'utf8');
  const dataBrowserPort = readFileSync(
    path.join(root, 'src/features/data/ports/data-core-browser-ports.ts'),
    'utf8',
  );
  assert.match(browserRoot, /registerDataCoreBrowserPorts\(\)/);
  assert.match(dataBrowserPort, /configureAsolApiBrowserLocalReadCache\(/);

  const networkStatusProvider = readFileSync(
    path.join(root, 'src/features/network/presentation/hooks/use-network-status.tsx'),
    'utf8',
  );
  assert.match(
    networkStatusProvider,
    /registerBrowserPorts\(\)/,
    'startup network health checks must compose the browser local-read gateway before their first effect',
  );
}

async function main() {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalFetch = globalThis.fetch;
  Object.defineProperty(globalThis, 'window', {
    value: { location: { origin: 'https://app.example', protocol: 'https:' } },
    configurable: true,
  });

  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error('network must not be reached by this test');
  };

  try {
    const client = new AsolApiClient();
    let cacheReads = 0;
    configureAsolApiBrowserLocalReadCache({
      read: async <T>(request: { cacheKey: string; policy: string; load: () => Promise<T> }) => {
        cacheReads += 1;
        assert.match(request.cacheKey, /^GET:\/api\/products#/);
        assert.equal(request.policy, 'localFirst');
        return { source: 'local' } as T;
      },
      invalidateAll: async () => undefined,
    });

    assert.deepEqual(await client.get('/api/products'), { source: 'local' });
    assert.equal(cacheReads, 1, 'browser GET must enter the local-read cache exactly once');
    assert.equal(fetchCalls, 0, 'a local hit must never touch the network transport');

    configureAsolApiBrowserLocalReadCache({
      read: async <T>() => {
        cacheReads += 1;
        return { source: 'local' } as T;
      },
      invalidateAll: async () => undefined,
    });
    assert.deepEqual(await client.getAbsoluteJson('https://cdn.example/manifest.json'), { source: 'local' });
    assert.equal(cacheReads, 2, 'absolute JSON reads must use the same browser local-read gate');
    assert.equal(fetchCalls, 0);

    resetAsolApiBrowserLocalReadCacheForTests();
    await assert.rejects(
      client.get('/api/products'),
      /browser local-read cache is not configured/,
      'missing browser cache composition must fail closed instead of falling through to cloud',
    );
    assert.equal(fetchCalls, 0, 'fail-closed composition must still perform zero network requests');

    const sensitive = buildAsolApiLocalReadCacheKey('/api/profile/store-details?uid=u1', {
      'X-Asol-Session-Token': 'secret-session-token',
    });
    assert.ok(!sensitive.includes('secret-session-token'), 'persisted cache keys must hash header values');
    assert.equal(defaultAsolApiLocalReadPolicy('/api/products'), 'localFirst');
    assert.equal(defaultAsolApiLocalReadPolicy('/api/orders'), 'volatile');
    assert.equal(defaultAsolApiLocalReadPolicy('/api/super-admin/users/search'), 'networkAuthoritative');
    assert.equal(defaultAsolApiLocalReadPolicy('https://signed.example/manifest.json'), 'networkAuthoritative');
  } finally {
    resetAsolApiBrowserLocalReadCacheForTests();
    globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }

  assertNoBrowserTransportBypass();
  console.log('AsolApi browser local-read gateway: local hit, absolute JSON, fail-closed, transport seal, and key privacy passed.');
}

void main();
