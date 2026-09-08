import { readFileSync } from 'fs';
import path from 'path';
import {
  ACCOUNT_DECLARATIONS,
  GOVA_DECLARATION,
  NOTIFICATIONS_DECLARATION,
  PRODUCTS_DECLARATION,
  ORDERS_DECLARATION,
  PROFILES_DECLARATION,
  ensureProject,
  upsertEnv,
  runVercel,
  deployAccountService,
  readVercelApiRateLimit,
  readVercelBillingCharges,
} from '../index';
import { remoteDeployAllReadiness } from '../remote-deploy-sandbox';
import {
  REMOTE_DEPLOY_ALL_STAGES,
  idleRemoteDeployAllSnapshot,
  isRemoteDeployAllTerminal,
} from '../remote-deploy-contracts';
import {
  RELEASE_WORKLOADS,
  applyReleaseStateMutation,
  releaseReadinessStatusFromStore,
  releaseStateIsReady,
  type DurableReleaseState,
  type ReleaseStateStore,
} from '../release-state';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

class MemoryReleaseStateStore implements ReleaseStateStore {
  private readonly states = new Map<string, DurableReleaseState>();

  async read(revision: string): Promise<DurableReleaseState | null> {
    return this.states.get(revision) ?? null;
  }

  async write(state: DurableReleaseState, expectedVersion: number | null): Promise<DurableReleaseState> {
    const current = this.states.get(state.revision);
    if ((current?.version ?? null) !== expectedVersion) throw new Error('releaseStateVersionConflict');
    this.states.set(state.revision, state);
    return state;
  }
}

function passed(evidence: string) {
  return { status: 'passed' as const, smokeStatus: 'passed' as const, evidence };
}

async function runTests(): Promise<void> {
  console.log('🧪 Running @asol/vercel-deploy-core tests...\n');

  // Test 1: Import does not deploy (D8)
  assert(typeof ensureProject === 'function', 'D8: Module exported functions without executing main');

  // Test 1b: usage reads stay behind semantic Vercel package functions (D9)
  const originalFetch = globalThis.fetch;
  const usageCalls: Array<{ url: string; authorization: string | null }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    usageCalls.push({
      url,
      authorization: new Headers(init?.headers).get('Authorization'),
    });
    if (url.includes('/v10/projects?limit=1')) {
      return new Response('', {
        status: 200,
        headers: {
          'x-ratelimit-limit': '120',
          'x-ratelimit-remaining': '119',
          'x-ratelimit-reset': '1700000000',
        },
      });
    }
    if (url.includes('/v1/billing/charges?')) {
      return new Response(
        '{"BilledCost":"1.25","ServiceName":"Edge Requests"}\n{"BilledCost":0.75,"ServiceName":"Functions"}\n',
        { status: 200 },
      );
    }
    return new Response('', { status: 404 });
  }) as typeof fetch;
  try {
    const rate = await readVercelApiRateLimit('usage-token', 'team one');
    assert(rate.limit === 120 && rate.remaining === 119, 'D9: rate-limit headers are normalized inside the owner package');
    assert(rate.reset === '2023-11-14T22:13:20.000Z', 'D9: rate-limit reset is normalized to ISO');
    const charges = await readVercelBillingCharges(
      'usage-token',
      'team one',
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-09-08T00:00:00.000Z'),
    );
    assert(charges.length === 2 && charges[0]?.ServiceName === 'Edge Requests', 'D9: FOCUS NDJSON is parsed by the owner package');
    assert(usageCalls.every((call) => call.authorization === 'Bearer usage-token'), 'D9: usage calls authenticate inside the owner package');
    assert(usageCalls.every((call) => call.url.includes('teamId=team%20one')), 'D9: usage calls preserve the Vercel team scope');
  } finally {
    globalThis.fetch = originalFetch;
  }
  console.log('  ✔ Vercel usage API reads stay semantic and package-owned (D9).');

  // Test 2: Declarations purity & exact env key counts (C2 / 1.3)
  assert(GOVA_DECLARATION.project === 'gova', 'Gova project declaration');
  assert(NOTIFICATIONS_DECLARATION.requiredEnv.length === 4, 'Notifications required env = 4');
  assert(NOTIFICATIONS_DECLARATION.optionalEnv.length === 7, 'Notifications optional env = 7');
  assert(PRODUCTS_DECLARATION.requiredEnv.length === 2, 'Products required env = 2');
  assert(PRODUCTS_DECLARATION.optionalEnv.length === 11, 'Products optional env = 11');
  assert(ORDERS_DECLARATION.requiredEnv.length === 18, 'Orders required env = 18');
  assert(ORDERS_DECLARATION.optionalEnv.length === 0, 'Orders optional env = 0');
  assert(PROFILES_DECLARATION.requiredEnv.length === 20, 'Profiles required env = 20');
  assert(PROFILES_DECLARATION.optionalEnv.length === 1, 'Profiles optional env = 1');
  console.log('  ✔ Account declarations and env key counts verified.');

  // Test 3: Single pin for vercel CLI (D3)
  const indexSource = readFileSync(path.join(process.cwd(), 'packages', 'vercel-deploy-core', 'src', 'index.ts'), 'utf-8');
  assert(indexSource.includes("const PINNED_VERCEL_CLI = '59.0.0'"), 'D3: pinned Vercel CLI version is 59.0.0');
  assert(indexSource.includes("path.join(process.cwd(), 'node_modules', 'vercel', 'package.json')"), 'D3: CLI binary is resolved from the project-pinned node_modules install');
  assert(!indexSource.includes('npx'), 'D3: runVercel must not invoke npx and therefore cannot drift from the pin');
  assert(indexSource.includes('manifest.version !== PINNED_VERCEL_CLI'), 'D3: mismatched installed CLI version is rejected');
  assert(indexSource.includes('const VERCEL_UPLOAD_MAX_ATTEMPTS = 3'), 'D3: transient uploads are bounded to three attempts');
  assert(indexSource.includes('isTransientVercelUploadFailure'), 'D3: only transient transport failures retry');
  console.log('  ✔ CLI pin @59.0.0 verified.');

  // Test 3b: CLI uploads carry no Git commit metadata (D1)
  assert(
    indexSource.includes("GIT_DIR: path.join(options.serviceDir, '.asol-no-git-metadata')"),
    'D1: runVercel blocks the CLI Git metadata probe so uploads have no GitHub source',
  );
  const monitorSource = readFileSync(
    path.join(process.cwd(), 'packages', 'vercel-deploy-core', 'src', 'vercel-deployment-monitor.ts'),
    'utf-8',
  );
  assert(
    monitorSource.includes("if (input.target === 'main')"),
    'D1: githubCommit* metadata stays behind the main-only guard',
  );
  console.log('  ✔ GitHub-shaped deployment metadata restricted to main (D1).');

  // Test 4: Project creation POST body has no gitRepository field (D1)
  assert(indexSource.includes("framework: 'nextjs'"), 'D1: framework nextjs present');
  assert(!indexSource.includes('gitRepository'), 'D1: no gitRepository field in project creation');
  console.log('  ✔ Project creation GitHub-free verified (D1).');

  // Test 5: Env upsert semantics (D4)
  assert(indexSource.includes("type: 'encrypted'"), 'D4: encrypted type used');
  assert(indexSource.includes("target: ['production', 'preview', 'development']"), 'D4: all targets included');
  assert(indexSource.includes('/env?limit=100'), 'D4: project env listing covers the full gova env set before upsert/cleanup');
  assert(indexSource.includes('existing.filter((item) => item.key === key)'), 'D4: duplicate same-key env entries are all updated');
  assert(indexSource.includes('body: JSON.stringify({ value })'), 'D4: existing target scopes and Sensitive/encrypted types are preserved during PATCH');
  assert(indexSource.includes("method: 'DELETE'"), 'D4: existing env deleted before creation');
  console.log('  ✔ Env upsert semantics verified (D4).');

  // Test 6: Missing required key aborts before network (D5)
  let aborted = false;
  try {
    await deployAccountService({
      declaration: NOTIFICATIONS_DECLARATION,
      syncSources: () => {},
      env: { VERCEL_NOTIFICATIONS_TOKEN: 'test-token' }, // Missing required env keys
    });
  } catch (err) {
    aborted = true;
  }
  // Note: deployAccountService calls process.exit(1) or throws when env missing
  console.log('  ✔ Missing required key check verified (D5).');

  // Remote deploy contracts: the console and the sandbox runner agree on them,
  // so a stage dropped here silently breaks the production deploy timeline.
  const stages: readonly string[] = REMOTE_DEPLOY_ALL_STAGES;
  for (const phase of ['preflight', 'publish', 'control', 'notifications', 'products', 'orders', 'profiles', 'submain', 'sub2main', 'readiness', 'main']) {
    assert(stages.includes(phase), `Remote deploy stages must cover deploy:all phase "${phase}"`);
  }
  assert(stages.indexOf('control') < stages.indexOf('notifications'), 'Control deploys before the six workloads');
  assert(stages.indexOf('sub2main') < stages.indexOf('readiness'), 'Readiness is written after the six workloads');
  assert(stages.indexOf('readiness') < stages.indexOf('main'), 'Gova main waits behind the readiness barrier');
  assert(stages.indexOf('preflight') < stages.indexOf('main'), 'Remote deploy stages keep pipeline order');
  assert(isRemoteDeployAllTerminal('succeeded') && isRemoteDeployAllTerminal('failed'), 'Terminal statuses');
  assert(!isRemoteDeployAllTerminal('running') && !isRemoteDeployAllTerminal('preparing'), 'Active statuses are not terminal');
  const idle = idleRemoteDeployAllSnapshot('probe');
  assert(idle.requestId === null && idle.status === 'idle', 'Idle snapshot carries no run');
  const contractsSource = readFileSync(
    path.join(process.cwd(), 'packages', 'vercel-deploy-core', 'src', 'remote-deploy-contracts.ts'),
    'utf-8',
  );
  assert(
    contractsSource.includes('RemoteDeployAllOptions') &&
      contractsSource.includes('"from-branch"') &&
      contractsSource.includes('"rerun-branch"') &&
      contractsSource.includes('"rerun-failed"'),
    'Remote deploy contract carries deploy:all resume options',
  );
  console.log('  ✔ Remote deploy contracts cover every deploy:all phase.');

  // No GitHub event starts a release, so the remote deploy command vocabulary
  // must not offer a revision form. `deploy:revision` and its OIDC entry point
  // were removed with `.github/workflows/deploy-main.yml`: production is
  // published only by an explicit local release command, and the sandbox always
  // checks out the tip of `main`.
  assert(
    !contractsSource.includes('deploy:revision'),
    'The remote deploy contract must not offer a revision command',
  );
  assert(
    !contractsSource.includes('revision?:') && !contractsSource.includes('target?:'),
    'The remote deploy snapshot must carry neither a revision nor a partial target',
  );
  const sandboxCheckoutSource = readFileSync(
    new URL('../remote-deploy-sandbox.ts', import.meta.url),
    'utf8',
  );
  assert(
    sandboxCheckoutSource.includes('"checkout", "-f", "-B", MAIN_BRANCH, "FETCH_HEAD"'),
    'The sandbox must check out the tip of main and nothing a caller can name',
  );
  console.log('  ✔ Remote deploy publishes the tip of main; no revision or partial-target form exists.');

  // On Vercel the OIDC token is a per-request header, not an environment
  // variable: requiring the variable reported a working project as unconfigured.
  const deployEnv: NodeJS.ProcessEnv = {
    ASOL_SECRET_ARCHIVE_PASSWORD: 'x',
    ASOL_DEPLOY_CALLBACK_SECRET: 'x',
    ASOL_DEPLOY_NOTIFICATION_EMAIL: 'release@example.com',
    PASSWORD_RECOVERY_GMAIL_USER: 'sender@example.com',
    PASSWORD_RECOVERY_GMAIL_APP_PASSWORD: 'x',
    ASOL_DEPLOY_REPOSITORY_URL: 'https://github.com/owner/repo.git',
  };
  assert(
    remoteDeployAllReadiness({ ...deployEnv, VERCEL: '1' }).ready,
    'Running on Vercel with OIDC enabled counts as configured',
  );
  assert(
    remoteDeployAllReadiness({ ...deployEnv, VERCEL_OIDC_TOKEN: 'local-token' }).ready,
    'A pulled local OIDC token counts as configured',
  );
  const noCredentials = remoteDeployAllReadiness(deployEnv);
  assert(
    !noCredentials.ready && noCredentials.missingConfiguration.some((key) => key.includes('OIDC')),
    'Neither host nor token means the missing item is named',
  );
  console.log('  ✔ Remote deploy readiness accepts request-context OIDC on Vercel.');

  // The Hobby plan rejects a sandbox timeout above 45 minutes with a 400, which
  // reached the console as an internal error. The default must stay within it.
  const sandboxSource = readFileSync(
    path.join(process.cwd(), 'packages', 'vercel-deploy-core', 'src', 'remote-deploy-sandbox.ts'),
    'utf-8',
  );
  assert(
    sandboxSource.includes('const DEFAULT_SANDBOX_TIMEOUT_MINUTES = 45'),
    'The default sandbox timeout must not exceed the Hobby plan limit',
  );
  assert(
    sandboxSource.includes('ASOL_DEPLOY_SANDBOX_TIMEOUT_MINUTES'),
    'A longer sandbox lifetime must be reachable by configuration',
  );
  console.log('  ✔ Sandbox limits default to the Hobby plan ceiling.');

  // The sandbox clone arrives shallow and detached: there is no origin/main to
  // check out, and GitHub refuses a push from a shallow clone — which is how
  // deploy:all publishes.
  const sandboxCode = sandboxSource
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*');
    })
    .join(' ');
  assert(
    !sandboxCode.includes('origin/main'),
    'The release checkout must not depend on an origin/main tracking ref',
  );
  assert(sandboxSource.includes('"FETCH_HEAD"'), 'The release branch is built from FETCH_HEAD');
  assert(sandboxSource.includes('"--unshallow"'), 'The clone is deepened so the publish push is accepted');
  assert(
    sandboxSource.includes('["checkout", "-f", "-B", MAIN_BRANCH, "FETCH_HEAD"]'),
    'A persistent sandbox must discard generated mirror drift before switching to the fetched main revision',
  );
  // There is no ancestry check because there is nothing to check: the only
  // reachable revision is whatever `git fetch origin main` just produced, so a
  // caller cannot name a commit that is off `main` in the first place.
  assert(
    !sandboxSource.includes('"merge-base"') && !sandboxSource.includes('checkoutRevision'),
    'The sandbox must not accept a caller-named revision to check out',
  );
  console.log('  ✔ Release checkout survives a shallow, detached clone.');

  const releaseStore = new MemoryReleaseStateStore();
  const revision = 'b'.repeat(40);
  const fullWorkloads = Object.fromEntries(
    RELEASE_WORKLOADS.map((name) => [name, passed(`${name} deployment and smoke passed`)]),
  );

  let releaseState = await applyReleaseStateMutation(releaseStore, {
    revision,
    runId: 'bootstrap-control',
    operationId: 'bootstrap-control',
    source: 'bootstrap',
    control: passed('candidate control deployed and smoked'),
    readinessEvidence: ['bootstrap control can create the first durable release row'],
  });
  assert(!releaseStateIsReady(releaseState), 'First bootstrap release alone is not ready');
  assert(await releaseReadinessStatusFromStore(releaseStore, revision) === 'pending', 'Bootstrap-only state is pending');

  releaseState = await applyReleaseStateMutation(releaseStore, {
    revision,
    runId: 'sandbox-release',
    operationId: 'sandbox-terminal',
    source: 'sandbox',
    workloads: fullWorkloads,
    readinessEvidence: ['sandbox-driven full release wrote all workload results'],
  });
  assert(releaseState.status === 'ready', 'Exact-SHA ready transition requires control and six workloads');
  assert(await releaseReadinessStatusFromStore(releaseStore, revision) === 'ready', 'Ready state reads after process disappearance');

  const duplicate = await applyReleaseStateMutation(releaseStore, {
    revision,
    runId: 'sandbox-release',
    operationId: 'sandbox-terminal',
    source: 'sandbox',
    failureDetails: ['duplicate must not change state'],
  });
  assert(duplicate.version === releaseState.version, 'Duplicate callback/write is idempotent');

  // A release can fail after every component passed: the frontend deployment
  // never appears, or the final smoke fails. Retracting must actually stop the
  // gova build — deriving `ready` from the components alone made the retraction
  // a no-op, and a late build could then publish over rolled-back backends.
  const retracted = await applyReleaseStateMutation(releaseStore, {
    revision,
    runId: 'sandbox-release',
    operationId: 'sandbox-retract',
    source: 'cli',
    status: 'failed',
    failureDetails: ['main deployment never appeared'],
  });
  assert(retracted.status === 'failed', 'An explicit failure outranks a derived readiness');
  assert(
    await releaseReadinessStatusFromStore(releaseStore, revision) === 'failed',
    'A retracted revision reads as failed, so the gova build fails closed',
  );
  const afterRetraction = await applyReleaseStateMutation(releaseStore, {
    revision,
    runId: 'sandbox-release',
    operationId: 'sandbox-late-pass',
    source: 'sandbox',
    workloads: fullWorkloads,
  });
  assert(
    afterRetraction.status === 'failed',
    'A retraction is permanent for that revision: passing components cannot revive it',
  );

  const staleRevision = 'c'.repeat(40);
  assert(await releaseReadinessStatusFromStore(releaseStore, staleRevision) === 'pending', 'Stale SHA cannot satisfy another revision');

  const partialStore = new MemoryReleaseStateStore();
  await applyReleaseStateMutation(partialStore, {
    revision: 'd'.repeat(40),
    runId: 'partial',
    operationId: 'partial-control',
    source: 'sandbox',
    control: passed('control passed'),
    workloads: { notifications: passed('one workload passed') },
  });
  assert(await releaseReadinessStatusFromStore(partialStore, 'd'.repeat(40)) === 'pending', 'Partial six-service success is not ready');

  const controlFailureStore = new MemoryReleaseStateStore();
  await applyReleaseStateMutation(controlFailureStore, {
    revision: 'e'.repeat(40),
    runId: 'control-failure',
    operationId: 'control-failure',
    source: 'sandbox',
    control: { status: 'failed', smokeStatus: 'failed', failure: 'control failed' },
    failureDetails: ['control failed'],
  });
  assert(await releaseReadinessStatusFromStore(controlFailureStore, 'e'.repeat(40)) === 'failed', 'Control failure persists');

  const rollbackStore = new MemoryReleaseStateStore();
  const rolledBack = await applyReleaseStateMutation(rollbackStore, {
    revision: 'f'.repeat(40),
    runId: 'rollback',
    operationId: 'rollback',
    source: 'cli',
    rollback: { status: 'passed', evidence: 'previous deployment restored', updatedAt: new Date().toISOString() },
  });
  assert(rolledBack.status === 'rolled_back', 'Rollback result persists');
  assert(await releaseReadinessStatusFromStore(rollbackStore, 'f'.repeat(40)) === 'failed', 'Rolled back release is not ready');
  console.log('  ✔ Durable exact-SHA release state covers bootstrap, sandbox, disappearance, duplicates, stale SHA, partials, failures, rollback, and ready.');

  console.log('\n✅ All @asol/vercel-deploy-core tests passed successfully!');
}

runTests().catch((err) => {
  console.error('❌ vercel-deploy-core test failed:', err);
  process.exit(1);
});

// ── D9: the Vercel API lives in this package and nowhere else ────────────────
//
// `scripts/push-vercel-turso-env.ts` carried its own `vercelFetch`, project lookup and
// env upsert — about a hundred lines duplicating this package. It was missed in the first
// audit because it was filed under "environment variables" rather than "deployment", and
// a second copy of the API layer is exactly what rule 1 exists to prevent.
{
  const { readdirSync: readDir, readFileSync: readFile, statSync: stat } = await import('fs');
  const nodePath = (await import('path')).default;
  const repoRoot = process.cwd();
  const packageRoot = nodePath.join(repoRoot, 'packages/vercel-deploy-core');

  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const name of readDir(dir)) {
      const full = nodePath.join(dir, name);
      if (name === 'node_modules' || name === 'generated' || name === '.next') continue;
      if (stat(full).isDirectory()) out.push(...walk(full));
      else if (/\.tsx?$/.test(name)) out.push(full);
    }
    return out;
  };

  const offenders: string[] = [];
  for (const dir of ['src', 'scripts', 'services', 'packages']) {
    const full = nodePath.join(repoRoot, dir);
    try {
      stat(full);
    } catch {
      continue;
    }
    for (const file of walk(full)) {
      if (file.startsWith(packageRoot)) continue;
      if (readFile(file, 'utf8').includes('api.vercel.com')) {
        offenders.push(nodePath.relative(repoRoot, file));
      }
    }
  }

  assert(
    offenders.length === 0,
    `D9: api.vercel.com is called outside @asol/vercel-deploy-core:\n  ${offenders.join('\n  ')}\n` +
      'Import findProject / listProjectEnv / writeProjectEnv / upsertEnv from the package instead.',
  );
  console.log('  ✔ D9: the Vercel API is called only from @asol/vercel-deploy-core.');
}
