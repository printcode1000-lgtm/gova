#!/usr/bin/env tsx
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';

/**
 * Builds the control runtime and asks it real questions.
 *
 * Health is deliberately not enough, for the reason `check-service-smoke.ts`
 * records: the outage those gates exist for left `/api/health` at 200 while
 * every data route answered 500, because no composition root had registered the
 * ports. Control's equivalent is authorization — every operational route is
 * behind the Super Admin session seam, so an unauthenticated request that comes
 * back `400 sessionTokenInvalid` proves the handler ran and its identity ports
 * were registered. A `500`, or a `404`, would not. The code is the application's
 * own: a missing token is `sessionTokenInvalid`, which the shared status mapping
 * puts at `400`, while `forbidden` — a valid session that is not the Super Admin
 * — is `403`.
 *
 * Control is smoked on its own rather than through the six-workload table: it
 * holds deployment authority over those accounts, and a loop that treats it as
 * one of them is a loop that can redeploy the runtime performing the deploy.
 */
const SERVICE_DIR = path.join(process.cwd(), 'services', 'control');
const PORT = Number(process.env.ASOL_CONTROL_SMOKE_PORT ?? 3320);
const STARTUP_TIMEOUT_MS = 90_000;
const ZERO_SHA = '0'.repeat(40);

interface Probe {
  readonly path: string;
  readonly method?: 'GET' | 'POST';
  /** Codes meaning the handler ran. An authorization refusal is an answer. */
  readonly accept: readonly number[];
  readonly why: string;
}

const PROBES: readonly Probe[] = [
  { path: '/api/health', accept: [200], why: 'the runtime is up' },
  {
    path: `/api/release-readiness/${ZERO_SHA}`,
    accept: [200],
    why: 'the release barrier answers for an unknown revision instead of failing',
  },
  {
    path: '/api/release-readiness/not-a-sha',
    accept: [400],
    why: 'the barrier refuses a short or malformed revision rather than guessing',
  },
  {
    path: '/api/super-admin/build-jobs',
    accept: [400],
    why: 'a control route rejects an unauthenticated caller through its own session seam',
  },
  {
    path: '/api/system-logs?limit=1',
    // System Logs is the one family that answers 401 for a missing session, as
    // the application does: its console must tell "sign in again" from "bad query".
    accept: [401],
    why: 'System Logs is control-owned and authenticated',
  },
  {
    path: '/api/ota/admin/releases',
    accept: [403],
    why: 'OTA administration is control-owned and rejects a non-admin identity',
  },
];

function build(): void {
  const run = (command: string, args: string[]): void => {
    execFileSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32', cwd: SERVICE_DIR });
  };
  // Each service is its own project, not a workspace of the root, so a root
  // install leaves it without dependencies. This mirrors what Vercel does.
  if (!existsSync(path.join(SERVICE_DIR, 'node_modules'))) {
    console.log('[control-smoke] installing dependencies...');
    run('npm', ['ci', '--no-audit', '--no-fund']);
  }
  console.log('[control-smoke] building...');
  run('npx', ['next', 'build']);
}

function start(): ChildProcess {
  const next = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  return spawn(process.execPath, [next, 'start', '-p', String(PORT)], {
    cwd: SERVICE_DIR,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitForListening(server: ChildProcess, log: string[]): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  server.stdout?.on('data', (chunk: Buffer) => log.push(chunk.toString()));
  server.stderr?.on('data', (chunk: Buffer) => log.push(chunk.toString()));
  while (Date.now() < deadline) {
    try {
      await fetch(`http://127.0.0.1:${PORT}/api/health`, { signal: AbortSignal.timeout(3_000) });
      return;
    } catch {
      // not listening yet
    }
    if (server.exitCode !== null) throw new Error(`control exited before listening\n${log.join('')}`);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`control did not listen within ${STARTUP_TIMEOUT_MS / 1000}s`);
}

async function main(): Promise<void> {
  if (!existsSync(SERVICE_DIR)) throw new Error('services/control is missing.');

  execFileSync('npx', ['tsx', 'scripts/sync-control-service-sources.ts'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  build();

  const log: string[] = [];
  const server = start();
  const failures: string[] = [];
  try {
    await waitForListening(server, log);
    for (const probe of PROBES) {
      const response = await fetch(`http://127.0.0.1:${PORT}${probe.path}`, {
        method: probe.method ?? 'GET',
        signal: AbortSignal.timeout(30_000),
      });
      const body = (await response.text()).slice(0, 200);
      if (!probe.accept.includes(response.status)) {
        failures.push(
          `${probe.method ?? 'GET'} ${probe.path}\n    HTTP ${response.status} — expected ${probe.accept.join(', ')} (${probe.why})\n    body: ${body}`,
        );
        continue;
      }
      // A barrier that leaks is worse than one that is down.
      if (probe.path.startsWith('/api/release-readiness') && response.status === 200) {
        const payload = JSON.parse(body) as Record<string, unknown>;
        const extra = Object.keys(payload).filter((key) => key !== 'revision' && key !== 'status');
        if (extra.length > 0) {
          failures.push(`${probe.path} exposes ${extra.join(', ')}; the barrier answers a status and nothing else.`);
        }
      }
      console.log(`[control-smoke] ${response.status} ${probe.method ?? 'GET'} ${probe.path} — ${probe.why}`);
    }
  } finally {
    server.kill('SIGTERM');
    // Never leave a build directory inside a folder the CLI uploads verbatim.
    rmSync(path.join(SERVICE_DIR, '.next'), { recursive: true, force: true });
  }

  if (failures.length > 0) {
    console.error(`❌ control smoke failed:\n- ${failures.join('\n- ')}`);
    process.exit(1);
  }
  console.log('✅ control smoke passed: routing, authorization, and the release barrier all answer.');
}

main().catch((error) => {
  console.error('❌ control smoke failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
