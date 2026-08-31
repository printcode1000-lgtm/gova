#!/usr/bin/env tsx
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import path from 'node:path';

import {
  LOCAL_DEVELOPMENT_ACCOUNTS,
  LOCAL_DEVELOPMENT_PORTS,
  localDevelopmentOrigin,
  localDevelopmentPublicEnv,
  type LocalDevelopmentAccount,
} from '@asol/account-declarations';
import { resolveRouteOwner } from '@asol/account-bridge/routes';

/**
 * Runs the whole distributed topology locally, on the declared ports.
 *
 * Development used to be one process with a fallback: anything the bridge could
 * not place went to the main app, which answered it because the main app still
 * implemented everything. That made local development the one environment where
 * a routing mistake could not fail, and it is why the routing had to be proven
 * in production instead.
 *
 * So this starts all eight runtimes, points gova's client bridge at the local
 * origins exactly as production points it at public ones, and — with `--smoke` —
 * asks each destination for a route it actually owns.
 *
 * No `npm ci` per service: every runtime is started with the repository's own
 * pinned Next binary from its own folder, which is how the smoke gates already
 * run them.
 */
const ROOT = process.cwd();
const NEXT_BIN = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const STARTUP_TIMEOUT_MS = 180_000;

function directoryFor(account: LocalDevelopmentAccount): string {
  return account === 'gova' ? ROOT : path.join(ROOT, 'services', account);
}

/**
 * One route each destination owns, and the codes that mean its handler ran.
 *
 * Health is deliberately not the probe: the outage the service smoke gates exist
 * for left `/api/health` at 200 while every data route answered 500. An
 * authorization refusal or a validation error is an answer; a 404 or a 500 is
 * not.
 */
const OWNED_ROUTE_PROBES: Readonly<Record<LocalDevelopmentAccount, { path: string; accept: number[] }>> = {
  gova: { path: '/api/health', accept: [200] },
  control: { path: '/api/super-admin/build-jobs', accept: [400, 401, 403] },
  notifications: { path: '/api/notifications/send', accept: [200, 400, 401, 405] },
  products: { path: '/api/products?limit=1', accept: [200, 400] },
  orders: { path: '/api/orders?uid=probe&limit=1', accept: [200, 400, 401, 403, 404] },
  profiles: { path: '/api/profile/store-details?uid=probe', accept: [200, 400, 404] },
  submain: { path: '/api/search/products?q=probe&limit=1', accept: [200, 400] },
  sub2main: { path: '/api/storage/upload', accept: [400, 401, 403, 405] },
};

function selectedAccounts(): LocalDevelopmentAccount[] {
  const flag = process.argv.find((argument) => argument.startsWith('--only='));
  if (!flag) return [...LOCAL_DEVELOPMENT_ACCOUNTS];
  const names = flag.slice('--only='.length).split(',').map((name) => name.trim());
  for (const name of names) {
    if (!LOCAL_DEVELOPMENT_ACCOUNTS.includes(name as LocalDevelopmentAccount)) {
      throw new Error(`--only names "${name}", which is not a declared runtime.`);
    }
  }
  return names as LocalDevelopmentAccount[];
}

/**
 * Binding is the only reliable test.
 *
 * The first version asked the port over HTTP and treated a failed request as
 * "free". That missed a dev server bound to `::` while the probe went to
 * `127.0.0.1`, and the run died on `EADDRINUSE` several seconds later with a
 * message about the wrong thing. Binding the same way Next does answers the
 * question Next is about to ask.
 */
async function portIsFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, '::');
  });
}

/**
 * A port still held by a previous run is reported, not worked around.
 *
 * Picking a different port would start a topology whose origins do not match the
 * ones the bridge was told about, and the failure would surface later as a
 * routing bug rather than as the stale process it actually is.
 */
async function assertPortsAreFree(accounts: readonly LocalDevelopmentAccount[]): Promise<void> {
  const busy: string[] = [];
  for (const account of accounts) {
    const port = LOCAL_DEVELOPMENT_PORTS[account];
    if (!(await portIsFree(port))) busy.push(`${account} (${port})`);
  }
  if (busy.length > 0) {
    throw new Error(
      `Ports already in use: ${busy.join(', ')}. Stop the previous run first — ` +
        'starting on a different port would give the bridge origins that do not match the topology.',
    );
  }
}

function start(account: LocalDevelopmentAccount): ChildProcess {
  const cwd = directoryFor(account);
  if (!existsSync(cwd)) throw new Error(`${account}: ${path.relative(ROOT, cwd)} is missing.`);
  return spawn(
    process.execPath,
    [NEXT_BIN, 'dev', '--port', String(LOCAL_DEVELOPMENT_PORTS[account])],
    {
      cwd,
      env: {
        ...process.env,
        ...localDevelopmentPublicEnv(),
        // Each process must know which runtime it is, or the environment guard
        // validates it against gova's declaration.
        ASOL_RUNTIME_ACCOUNT: account,
        ...(account === 'gova' ? { ASOL_RUNTIME_ROLE: 'gova-frontend' } : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
}

async function waitForListening(account: LocalDevelopmentAccount, server: ChildProcess, log: string[]): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  server.stdout?.on('data', (chunk: Buffer) => log.push(chunk.toString()));
  server.stderr?.on('data', (chunk: Buffer) => log.push(chunk.toString()));
  while (Date.now() < deadline) {
    try {
      await fetch(`${localDevelopmentOrigin(account)}/api/health`, { signal: AbortSignal.timeout(3_000) });
      return;
    } catch {
      // not listening yet
    }
    if (server.exitCode !== null) {
      throw new Error(`${account} exited before listening\n${log.join('').slice(-2000)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`${account} did not listen within ${STARTUP_TIMEOUT_MS / 1000}s`);
}

async function smoke(accounts: readonly LocalDevelopmentAccount[]): Promise<string[]> {
  const failures: string[] = [];

  for (const account of accounts) {
    const probe = OWNED_ROUTE_PROBES[account];
    // The probe must be a route this account really owns, or a green smoke says
    // nothing about the topology it claims to verify.
    if (account !== 'gova') {
      const owner = resolveRouteOwner('GET', probe.path.split('?')[0]!)
        ?? resolveRouteOwner('POST', probe.path.split('?')[0]!);
      if (owner !== account) {
        failures.push(`${account}: probe ${probe.path} is owned by ${owner ?? 'nobody'}, not ${account}`);
        continue;
      }
    }
    try {
      const response = await fetch(`${localDevelopmentOrigin(account)}${probe.path}`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!probe.accept.includes(response.status)) {
        failures.push(
          `${account} GET ${probe.path} answered ${response.status}, expected one of ${probe.accept.join(', ')}`,
        );
        continue;
      }
      console.log(`[dev:distributed] ${response.status} ${account} ${probe.path}`);
    } catch (error) {
      failures.push(`${account}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // And gova's compatibility boundary must still send an old client onward.
  if (accounts.includes('gova')) {
    try {
      const response = await fetch(`${localDevelopmentOrigin('gova')}/api/system-logs?limit=1`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status !== 307) {
        failures.push(`gova compatibility boundary answered ${response.status}, expected 307`);
      } else {
        const location = response.headers.get('location') ?? '';
        if (!location.startsWith(localDevelopmentOrigin('control'))) {
          failures.push(`gova redirected /api/system-logs to ${location}, expected the control origin`);
        } else {
          console.log(`[dev:distributed] 307 gova /api/system-logs -> ${location}`);
        }
      }
    } catch (error) {
      failures.push(`gova boundary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return failures;
}

async function main(): Promise<void> {
  const accounts = selectedAccounts();
  const wantsSmoke = process.argv.includes('--smoke');
  await assertPortsAreFree(accounts);

  const running = new Map<LocalDevelopmentAccount, ChildProcess>();
  const stop = (): void => {
    for (const server of running.values()) server.kill('SIGTERM');
  };
  process.on('SIGINT', () => {
    stop();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    stop();
    process.exit(143);
  });

  try {
    for (const account of accounts) {
      const log: string[] = [];
      const server = start(account);
      running.set(account, server);
      await waitForListening(account, server, log);
      console.log(`[dev:distributed] ${account} ready on ${localDevelopmentOrigin(account)}`);
    }

    if (!wantsSmoke) {
      console.log('[dev:distributed] all runtimes are up. Ctrl+C to stop.');
      await new Promise(() => {});
      return;
    }

    const failures = await smoke(accounts);
    if (failures.length > 0) {
      console.error(`❌ dev:distributed smoke failed:\n- ${failures.join('\n- ')}`);
      process.exitCode = 1;
      return;
    }
    console.log('✅ dev:distributed smoke passed: every destination answered a route it owns.');
  } finally {
    if (wantsSmoke) stop();
  }
}

main().catch((error) => {
  console.error('❌ dev:distributed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
