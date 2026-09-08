import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

import { ROOT, addViolation } from './architecture-types';

/**
 * There is one server database backend, and no source may reach for another.
 *
 * This used to be a per-account pin: every isolated deployment had to declare
 * `forceRemoteDataSource: true` because a runtime that called itself development
 * would otherwise select a filesystem SQLite backend, load a native driver the
 * account does not ship, and answer 500 on every route reaching data while
 * `/api/health` stayed 200 and Vercel reported READY. Six roots passed the pin
 * because six were fixed by hand; the seventh was the one that would forget.
 *
 * The pin is gone because the choice is gone. Server application data is
 * Turso/libSQL in every runtime, so what this now enforces is the property the
 * pin was standing in for: no production, build, provisioning or tooling source
 * imports `better-sqlite3` at all. An account cannot select a driver that
 * nothing can reach.
 *
 * `docs/08-troubleshooting/problems/every-server-route-500-unregistered-port.md`
 * records the outage the registration half of this check still guards against.
 */
const REGISTRAR = 'registerDataCoreRuntimeConfigPorts';
const LOCAL_DATABASE_DRIVER = 'better-sqlite3';

/** Source trees whose closures reach a deployed runtime or a build step. */
const SCANNED_ROOTS = ['src', 'packages', 'scripts', 'services'] as const;

const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  '.next',
  'out',
  'dist',
  'build',
  'generated',
]);

/**
 * Where an isolated SQLite test may still live.
 *
 * A test file under a `tests/` directory, or named `*.test.ts`, may open an
 * in-memory or temporary-directory database. It may never touch an application
 * persistence path, and it is not part of any production closure.
 */
function isApprovedTestPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  return /(^|\/)tests?\//.test(normalized) || /\.test\.tsx?$/.test(normalized);
}

/**
 * A guard is allowed to name the driver — that is its whole job.
 *
 * This check itself, the deployment artifact gate, and the repository sweep all
 * assert the driver's *absence*, so a match inside one of them is the contract
 * working rather than a violation of it.
 */
const NEGATIVE_GUARD_FILES = new Set(
  [
    'packages/architecture-core/src/checks/isolated-deployment-backend-contract.ts',
    'packages/architecture-core/src/checks/native-contract.ts',
    'packages/architecture-core/src/checks/repository-sweep-contract.ts',
    'packages/architecture-core/src/checks/vendor-ownership-contract.ts',
    'packages/architecture-core/src/contracts/contract.ts',
    'packages/architecture-core/src/registry/capability-registry.ts',
    'packages/gova-deployment-core/src/artifact-gate.ts',
    'packages/service-mirror-core/src/index.ts',
    'scripts/check-environment-requirements.ts',
  ].map((path) => path.replace(/\//g, '/')),
);

function* walk(directory: string): Generator<string> {
  if (!existsSync(directory)) return;
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (SKIPPED_DIRECTORIES.has(item.name)) continue;
    const full = join(directory, item.name);
    if (item.isDirectory()) {
      yield* walk(full);
      continue;
    }
    if (/\.(tsx?|mts|cts|mjs|cjs|js)$/.test(item.name)) yield full;
  }
}

/** No production, build, provisioning or tooling source loads the local driver. */
function checkNoLocalDatabaseDriverInProductionClosure(): void {
  for (const root of SCANNED_ROOTS) {
    for (const file of walk(join(ROOT, root))) {
      const relativePath = relative(ROOT, file).replace(/\\/g, '/');
      if (NEGATIVE_GUARD_FILES.has(relativePath)) continue;
      if (isApprovedTestPath(relativePath)) continue;

      const content = readFileSync(file, 'utf8');
      if (!content.includes(LOCAL_DATABASE_DRIVER)) continue;

      addViolation(
        'Isolated Deployment Backend',
        relativePath,
        `${relativePath} reaches ${LOCAL_DATABASE_DRIVER} outside a test.`,
        `Server application data is Turso/libSQL in every runtime. A local database driver in a ` +
          `production, build, provisioning or tooling closure is a second backend by another name; ` +
          `an isolated test may use one only in memory or a temporary directory.`,
      );
    }
  }
}

/**
 * Every deployed account registers the port, and something calls its root.
 *
 * A composition root with an empty body used to pass every check: it had nothing
 * to pin, so it was skipped. `control` shipped exactly that way —
 * `registerControlServerPorts` was an empty function, nothing imported it, and
 * every control route that reached a shard answered 500 while the deployment
 * reported READY and every gate stayed green.
 *
 * Registering is not enough either. A root that registers at module scope only
 * runs when something imports it, so the service must reach its composition
 * from its own sources — through `instrumentation.ts` or from its routes.
 */
function checkDeployedAccountRegistersItsPorts(): void {
  const servicesDir = join(ROOT, 'services');
  if (!existsSync(servicesDir)) return;

  for (const service of readdirSync(servicesDir)) {
    const serviceSrc = join(servicesDir, service, 'src');
    if (!existsSync(serviceSrc)) continue;

    const folder = `${service}-composition`;
    const entry = join(ROOT, 'packages', folder, 'src', 'index.ts');
    if (!existsSync(entry)) {
      addViolation(
        'Isolated Deployment Backend',
        join('services', service),
        `services/${service} has no composition root at packages/${folder}.`,
        'Every deployed account is a composition root: it must register the ports its routes use.',
      );
      continue;
    }

    if (!readFileSync(entry, 'utf8').includes(`${REGISTRAR}(`)) {
      addViolation(
        'Isolated Deployment Backend',
        entry,
        `${folder} never registers the data-core runtime port.`,
        `Call ${REGISTRAR}(). Without it every route in services/${service} that reaches a shard answers 500 while /api/health stays 200.`,
      );
      continue;
    }

    if (!serviceReachesItsComposition(serviceSrc, folder)) {
      addViolation(
        'Isolated Deployment Backend',
        join('services', service, 'src'),
        `services/${service} never imports @asol/${folder}.`,
        'A composition root that nothing imports never runs. Import it from the service\'s instrumentation.ts or from its routes.',
      );
    }
  }
}

/** Whether any file under the service's own sources imports its composition. */
function serviceReachesItsComposition(serviceSrc: string, folder: string): boolean {
  const needle = `@asol/${folder}`;
  const stack = [serviceSrc];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const item of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, item.name);
      if (item.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!/\.tsx?$/.test(item.name)) continue;
      if (readFileSync(full, 'utf8').includes(needle)) return true;
    }
  }
  return false;
}

export function checkIsolatedDeploymentBackendContract(): void {
  checkNoLocalDatabaseDriverInProductionClosure();
  checkDeployedAccountRegistersItsPorts();
}
