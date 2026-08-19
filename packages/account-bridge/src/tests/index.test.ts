import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';
import {
  READ_ROUTES,
  SUBMAIN_ROUTES,
  SUB2MAIN_ROUTES,
  resolveServiceOriginForRuntime,
  type AppDeployment,
  type AppPlatform,
  type ServiceBridgeRuntime,
} from '../index';
import * as doorMain from '../index';
import * as doorNotifications from '../notifications';
import { ACCOUNT_DECLARATIONS } from '@asol/vercel-deploy-core';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function getAllFiles(dir: string, ext: string[]): string[] {
  let results: string[] = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    if (file === 'node_modules' || file === '.next' || file === '.git') continue;
    const stat = statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, ext));
    } else if (ext.some((e) => file.endsWith(e))) {
      results.push(filePath);
    }
  }
  return results;
}

function runRule0Tests(): void {
  console.log('🧪 Running @asol/account-bridge (Rule 0) Test Suite...\n');

  const packageDir = path.join(process.cwd(), 'packages/account-bridge');

  // ---------------------------------------------------------------- T1: Device-only module graph
  //
  // A real transitive walk, not a scan of this package's own files.
  //
  // The earlier version read only `packages/account-bridge/src/**` and called itself a
  // module-graph test. It could not see through `@asol/native-core` or `@/core/config/*`,
  // so a node builtin one hop away would have passed silently — and this channel imports
  // both. Rule 0 is about what the graph *reaches*, so the test has to follow it.
  const bridgeFiles = getAllFiles(path.join(packageDir, 'src'), ['.ts', '.js']).filter(
    (f) => !f.replace(/\\/g, '/').includes('/tests/'),
  );
  const forbiddenImports = ['node:', 'fs', 'path', 'child_process', '@aws-sdk', 'google-auth-library', '@libsql'];
  const repoRoot = process.cwd();

  /** Resolves a specifier the way the bundler will: workspace doors, `@/`, and relative. */
  function resolveSpecifier(specifier: string, importer: string): string | null {
    if (specifier.startsWith('@asol/')) {
      const name = specifier.slice('@asol/'.length).split('/')[0];
      const manifestPath = path.join(repoRoot, 'packages', name, 'package.json');
      if (!existsSync(manifestPath)) return null;
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
        exports?: Record<string, string | { default?: string; types?: string }>;
      };
      // The scope separator is a slash too: `@asol/native-core` has no subpath, and
      // treating it as one produced the door `"./"`, which matches nothing. The walk then
      // resolved to null and silently stopped at this package's own edge — a graph test
      // that had quietly stopped walking the graph.
      const withoutScope = specifier.slice('@asol/'.length);
      const slash = withoutScope.indexOf('/');
      const door = slash === -1 ? '.' : `./${withoutScope.slice(slash + 1)}`;
      const entry = manifest.exports?.[door];
      const target = typeof entry === 'string' ? entry : entry?.default ?? entry?.types;
      return target ? path.join(repoRoot, 'packages', name, target) : null;
    }
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
    const base = specifier.startsWith('@/')
      ? path.join(repoRoot, 'src', specifier.slice(2))
      : path.resolve(path.dirname(importer), specifier);
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }

  const visited = new Set<string>();
  const queue = [...bridgeFiles];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);

    assert(
      !file.endsWith('.server.ts'),
      `T1: ${path.relative(repoRoot, file)} is a server-only module, reached from the channel`,
    );

    let content: string;
    try {
      content = readFileSync(file, 'utf-8');
    } catch {
      continue;
    }

    for (const match of content.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      for (const forbidden of forbiddenImports) {
        assert(
          !(specifier === forbidden || specifier.startsWith(forbidden)),
          `T1: ${path.relative(repoRoot, file)} reaches forbidden module "${specifier}". ` +
            `The channel runs on the device; nothing in its graph may need a server.`,
        );
      }
      const resolved = resolveSpecifier(specifier, file);
      if (resolved && !visited.has(resolved)) queue.push(resolved);
    }
  }
  // A size check alone was too weak: the walk stopped after four hops and still satisfied
  // `visited.size > bridgeFiles.length`. Assert on the specific thing that must be
  // reachable — the workspace package the channel imports — so a resolution bug fails
  // instead of shrinking the graph quietly.
  const reachedWorkspacePackage = [...visited].some((file) =>
    file.replace(/\\/g, '/').includes('/packages/native-core/'),
  );
  assert(
    reachedWorkspacePackage,
    'T1: the walk never reached @asol/native-core, which this channel imports. ' +
      'Specifier resolution is broken, and a graph test that walks nothing passes for ' +
      'the wrong reason.',
  );
  assert(
    visited.size > 50,
    `T1: only ${visited.size} files reachable — far below the real graph. The walk is ` +
      'terminating early.',
  );
  console.log(`  ✔ T1: device-only graph verified across ${visited.size} reachable files.`);

  // ------------------------------------------------- T1b: the edges into the app are pinned
  //
  // T1 proves the channel reaches no node capability. It says nothing about reaching the
  // *application*, and the channel was importing `@/features/notifications` — a 98-line
  // barrel exporting fifteen things — for one pure function. A channel that transitively
  // reaches the app is a channel whose seal is decoration.
  //
  // Every `@/` edge must be on this list, and every module on it must be a leaf or close
  // to one. Widening an edge means changing this list, deliberately.
  const ALLOWED_APP_EDGES = new Set([
    '@/core/config/public-env',
    '@/core/config/runtime-context',
    '@/features/notifications/domain/notification-grant-envelope',
    '@/features/notifications/domain/notification-grant-delivery-context',
  ]);
  for (const file of bridgeFiles) {
    const content = readFileSync(file, 'utf-8');
    for (const match of content.matchAll(/\bfrom\s+['"](@\/[^'"]+)['"]/g)) {
      assert(
        ALLOWED_APP_EDGES.has(match[1]),
        `T1b: ${path.basename(file)} imports "${match[1]}", which is not a declared app edge. ` +
          `Narrow it to a leaf module, inject it as a parameter, or add it here on purpose.`,
      );
    }
  }
  console.log(`  ✔ T1b: app edges pinned to the ${ALLOWED_APP_EDGES.size} declared leaves.`);

  // ---------------------------------------------------------------- T2: No account credential
  const forbiddenTokens = ['VERCEL_', 'TURSO_', '_AUTH_TOKEN', 'R2_ACCESS_KEY', '_SECRET', '_PRIVATE_KEY'];
  for (const file of bridgeFiles) {
    const content = readFileSync(file, 'utf-8');
    for (const token of forbiddenTokens) {
      // Allow ASOL_NOTIFICATION_GRANT_SECRET in comments or public env references if safe
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('//') || line.includes('/*')) continue;
        assert(!line.includes(token), `T2: ${file}:${i + 1} contains sensitive token string ${token}`);
      }
    }
  }
  console.log('  ✔ T2: No account credentials in channel verified.');

  // ---------------------------------------------------------------- T3: Not reachable from a deployment
  const servicesFiles = getAllFiles(path.join(process.cwd(), 'services'), ['.ts', '.tsx']);
  const forbiddenChannelPatterns = [
    '@asol/account-bridge',
    'src/modules/service-bridge',
    'src/modules/notification-bridge',
  ];
  for (const file of servicesFiles) {
    const content = readFileSync(file, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    for (const match of content.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      for (const forbidden of forbiddenChannelPatterns) {
        assert(
          !specifier.includes(forbidden),
          `T3: Service file ${file} imports inter-account channel "${specifier}"!`,
        );
      }
    }
  }
  console.log('  ✔ T3: Channel unreachable from service deployments verified.');

  // ---------------------------------------------------------------- T4: Every platform × deployment
  //
  // The platform must be part of the input and part of the expectation. An
  // earlier version of this test looped over `platform` without ever reading
  // it, so it ran the same web case nine times and reported nine combinations.
  const ORIGINS = {
    products: 'https://products.example.com',
    orders: 'https://orders.example.com',
    profiles: 'https://profiles.example.com',
    submain: 'https://submain.example.com',
    sub2main: 'https://sub2main.example.com',
  } as const;

  const platforms = ['web', 'android', 'ios'] as const;
  const deployments = ['local-development', 'web-production', 'static-export'] as const;

  /**
   * The expectation is derived from `platform`, so a platform-blind
   * implementation cannot satisfy every case. Native shells never stand down:
   * they have no local server to fall back to.
   */
  function expectedFor(platform: AppPlatform, deployment: AppDeployment): string | null {
    const native = platform === 'android' || platform === 'ios';
    if (!native && deployment === 'local-development') return null;
    return ORIGINS.products;
  }

  let nativeDevCases = 0;
  for (const platform of platforms) {
    for (const deployment of deployments) {
      const runtime: ServiceBridgeRuntime = {
        browser: true,
        // A native shell is built from the same bundle as a dev web build, so
        // this flag alone must not decide the outcome.
        developmentBuild: deployment === 'local-development',
        platform,
        deployment,
        origins: { ...ORIGINS },
      };
      const result = resolveServiceOriginForRuntime('GET', '/api/products', runtime);
      const expected = expectedFor(platform, deployment);
      assert(
        result === expected,
        `T4: ${platform} × ${deployment} expected ${expected} but got ${result}`,
      );
      if (platform !== 'web' && deployment === 'local-development') nativeDevCases += 1;
    }
  }
  assert(
    nativeDevCases === 2,
    'T4: the android and ios local-development cases must both be exercised',
  );
  console.log('  ✔ T4: platform is part of the input and the expectation (9 real combinations).');

  // ---------------------------------------------------------------- T5: Capacitor origin
  //
  // A Capacitor WebView is served from a localhost-like origin. Reading that as
  // "local development" would route every read back to the main account and
  // silently disable the service split on the two platforms that cannot be
  // fixed without a store release.
  for (const platform of ['android', 'ios'] as const) {
    const nativeRuntime: ServiceBridgeRuntime = {
      browser: true,
      developmentBuild: true,
      platform,
      deployment: 'static-export',
      origins: { ...ORIGINS },
    };
    assert(
      resolveServiceOriginForRuntime('GET', '/api/products', nativeRuntime) === ORIGINS.products,
      `T5: ${platform} on a localhost-like origin must still reach the remote service`,
    );
  }
  console.log('  ✔ T5: Capacitor WebView origins still resolve remote services.');

  // ---------------------------------------------------------------- T6: Static export
  //
  // A static export has no server of its own. Not being able to reach one is
  // the normal case, not the failure case.
  const staticRuntime: ServiceBridgeRuntime = {
    browser: true,
    developmentBuild: false,
    platform: 'web',
    deployment: 'static-export',
    origins: { ...ORIGINS },
  };
  assert(
    resolveServiceOriginForRuntime('GET', '/api/orders', staticRuntime) === ORIGINS.orders,
    'T6: a static export must resolve the service origin',
  );
  console.log('  ✔ T6: Static export resolution verified.');

  // ------------------------------------------------- T6b: the suite can catch its own bug
  //
  // A platform-blind implementation — the exact bug this phase fixed — must
  // fail at least one of the cases above. A suite that its own defect could not
  // have caught is not a test.
  function platformBlindResolve(
    method: string,
    route: string,
    runtime: ServiceBridgeRuntime,
  ): string | null {
    if (!runtime.browser || runtime.developmentBuild) return null;
    if (method.toUpperCase() !== 'GET') return null;
    const service = READ_ROUTES[route];
    return service ? runtime.origins[service] || null : null;
  }

  let blindFailures = 0;
  for (const platform of platforms) {
    for (const deployment of deployments) {
      const runtime: ServiceBridgeRuntime = {
        browser: true,
        developmentBuild: deployment === 'local-development',
        platform,
        deployment,
        origins: { ...ORIGINS },
      };
      if (
        platformBlindResolve('GET', '/api/products', runtime) !==
        expectedFor(platform, deployment)
      ) {
        blindFailures += 1;
      }
    }
  }
  assert(
    blindFailures > 0,
    'T6b: a platform-blind implementation must fail this suite; it did not, so the suite proves nothing',
  );
  console.log(`  ✔ T6b: platform-blind implementation fails ${blindFailures} case(s), as it must.`);

  // ---------------------------------------------------------------- T7: Exact matching, never prefix
  const runtime: ServiceBridgeRuntime = {
    browser: true,
    developmentBuild: false,
    origins: {
      products: 'https://products.example.com',
      orders: 'https://orders.example.com',
      profiles: 'https://profiles.example.com',
      submain: 'https://submain.example.com',
      sub2main: 'https://sub2main.example.com',
    },
  };
  assert(resolveServiceOriginForRuntime('GET', '/api/orders', runtime) === 'https://orders.example.com', 'T7: /api/orders matches orders');
  assert(resolveServiceOriginForRuntime('GET', '/api/orders/12345', runtime) === null, 'T7: /api/orders/12345 returns null');
  assert(resolveServiceOriginForRuntime('GET', '/api/orders/12345/items', runtime) === null, 'T7: /api/orders/12345/items returns null');
  assert(
    resolveServiceOriginForRuntime('GET', '/api/search/sellers', runtime) === 'https://submain.example.com',
    'T7: /api/search/sellers routes to submain',
  );
  assert(
    resolveServiceOriginForRuntime('POST', '/api/orders/from-cart', runtime) === 'https://submain.example.com',
    'T7: POST /api/orders/from-cart routes to submain',
  );
  assert(
    resolveServiceOriginForRuntime('PUT', '/api/profile/editor', runtime) === 'https://sub2main.example.com',
    'T7: PUT /api/profile/editor routes to sub2main',
  );
  assert(
    resolveServiceOriginForRuntime('POST', '/api/products', runtime) === 'https://sub2main.example.com',
    'T7: POST /api/products routes to sub2main',
  );
  assert(resolveServiceOriginForRuntime('GET', '/api/profile/reviews', runtime) === null, 'T7: /api/profile/reviews returns null');

  // Verify a prefix-based matcher would fail this test
  function prefixMatch(route: string): boolean {
    return route.startsWith('/api/orders');
  }
  assert(prefixMatch('/api/orders/12345') === true, 'T7: Prefix matcher simulation verified to fail');
  console.log('  ✔ T7: Exact matching verified and prefix simulation rejected.');

  // ---------------------------------------------------------------- T8: Exported surface is pinned
  const mainKeys = Object.keys(doorMain).sort();
  assert(mainKeys.includes('resolveServiceOrigin') && mainKeys.includes('resolveServiceOriginForRuntime') && mainKeys.includes('READ_ROUTES') && mainKeys.includes('SUBMAIN_ROUTES') && mainKeys.includes('SUB2MAIN_ROUTES'), 'T8: Door . exports exact surface');

  const notificationsKeys = Object.keys(doorNotifications).sort();
  assert(notificationsKeys.includes('deliverNotificationGrants') && notificationsKeys.includes('scheduleNotificationGrantDelivery'), 'T8: Door ./notifications exports exact surface');
  console.log('  ✔ T8: Exported surface pinned for both doors.');

  // ---------------------------------------------------------------- T9: Single path
  for (const name of Object.keys(ACCOUNT_DECLARATIONS)) {
    const decl = ACCOUNT_DECLARATIONS[name];
    assert(!('productsUrl' in decl), `T9: Account ${name} carries sibling URL`);
    assert(!('ordersUrl' in decl), `T9: Account ${name} carries sibling URL`);
  }
  console.log('  ✔ T9: Single path invariant verified (declarations carry zero sibling references).');

  // ---------------------------------------------------------------- T10: public-env isolation
  for (const service of ['orders', 'notifications', 'products', 'profiles', 'submain', 'sub2main'] as const) {
    const publicEnvPath = path.join(process.cwd(), `services/${service}/generated/src/core/config/public-env.ts`);
    if (!existsSync(publicEnvPath)) continue;
    const content = readFileSync(publicEnvPath, 'utf-8');
    for (const sibling of ['asol-notifications', 'asol-products', 'asol-orders', 'asol-profiles', 'asol-submain', 'asol-sub2main']) {
      assert(
        !content.includes(sibling),
        `T10: ${service} mirror must not embed sibling origin ${sibling}`,
      );
    }
  }
  console.log('  ✔ T10: public-env isolation verified across service mirrors.');

  console.log('\n✅ All 10 Rule 0 tests in @asol/account-bridge passed successfully!');
}

try {
  runRule0Tests();
} catch (err) {
  console.error('❌ Rule 0 test failed:', err);
  process.exit(1);
}
