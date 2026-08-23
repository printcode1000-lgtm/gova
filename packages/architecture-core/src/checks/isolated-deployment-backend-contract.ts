import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import { ROOT, addViolation } from './architecture-types';

/**
 * An isolated deployment pins the backend it is physically able to serve.
 *
 * Every account service aliases `better-sqlite3` to a stub that throws: it runs
 * against Turso only, and bundling the native driver would force a native build
 * for unreachable code. But the backend is resolved from the runtime context,
 * and a data source of `local` selects sqlite in any deployment that asks. So
 * an account that cannot load the driver was still letting configuration choose
 * it.
 *
 * That is not theoretical. During a real `deploy:all` the profiles account did
 * exactly this, loaded the driver it does not ship, and answered 500 on every
 * route reaching data — while `/api/health` stayed 200 and Vercel reported
 * READY. One environment variable reproduces it in production.
 *
 * `forceRemoteDataSource: true` states the invariant in code. Six composition
 * roots pass it today because six were fixed by hand; the seventh account is
 * the one that will forget, and forgetting is silent. This check is what makes
 * it loud.
 *
 * The main application is deliberately not covered: it ships the real driver
 * and needs the local branch for development. Only a deployment that cannot
 * serve both branches pins one.
 */
const REGISTRAR = 'registerDataCoreRuntimeConfigPorts';
const PIN = 'forceRemoteDataSource';

/** A composition package is an account's composition root: `<account>-composition`. */
function isolatedCompositionFolders(): readonly string[] {
  const packagesDir = join(ROOT, 'packages');
  if (!existsSync(packagesDir)) return [];
  return readdirSync(packagesDir).filter((folder) => folder.endsWith('-composition'));
}

/**
 * The stub must name the service it is in.
 *
 * All six stubs were copy-pasted and five reported a different account than the
 * one they ran in. When profiles failed, it said "not available in the
 * notifications service" — a cross-account red herring in the middle of an
 * outage, pointing the investigation at an account that was fine.
 */
function checkStubNamesItsOwnService(): void {
  const servicesDir = join(ROOT, 'services');
  if (!existsSync(servicesDir)) return;

  for (const service of readdirSync(servicesDir)) {
    const stub = join(servicesDir, service, 'stubs', 'better-sqlite3.js');
    if (!existsSync(stub)) continue;

    const content = readFileSync(stub, 'utf8');
    const named = /is not available in the ([\w-]+) service/.exec(content);
    if (!named) continue;
    if (named[1] === service) continue;

    addViolation(
      'Isolated Deployment Backend',
      stub,
      `${service}'s better-sqlite3 stub reports the "${named[1]}" service.`,
      `Name this service: a stub that blames another account sends the next outage after the wrong one.`,
    );
  }
}

export function checkIsolatedDeploymentBackendContract(): void {
  checkStubNamesItsOwnService();

  for (const folder of isolatedCompositionFolders()) {
    const entry = join(ROOT, 'packages', folder, 'src', 'index.ts');
    if (!existsSync(entry)) continue;

    const content = readFileSync(entry, 'utf8');
    // Only the roots that register the port are in scope. A composition package
    // that reaches no repository has nothing to pin.
    if (!content.includes(`${REGISTRAR}(`)) continue;
    if (content.includes(PIN)) continue;

    addViolation(
      'Isolated Deployment Backend',
      entry,
      `${folder} registers the data-core runtime port without pinning its backend.`,
      `Call ${REGISTRAR}({ ${PIN}: true }) — this deployment stubs better-sqlite3, so it must not let the environment select it.`,
    );
  }
}
