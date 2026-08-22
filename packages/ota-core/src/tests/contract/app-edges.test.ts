import { readFileSync, readdirSync } from 'fs';
import path from 'path';

/**
 * Pins every edge from `@asol/ota-core` into the application.
 *
 * Rule 7 runs both ways. Application `@/` imports are fully inverted into ports
 * (`telemetry`, `identity`, `httpApi`, `apiRoutes`, `publicEnv`, `appVersions`,
 * `categories`). This file must stay at zero declared app edges.
 *
 * Package doors (`@asol/data-core/*`, `@asol/native-core`) remain and are pinned
 * separately in `DECLARED_PACKAGE_DOORS`.
 *
 * The list should only ever shrink.
 */

const PACKAGE_SRC = path.join(process.cwd(), 'packages/ota-core/src');

/** Every `@/` module `ota-core` is allowed to import. Shrink, never grow. */
const DECLARED_APP_EDGES = new Set<string>([]);

/** Sealed-package doors this package may reach, and only through a declared door. */
const DECLARED_PACKAGE_DOORS = new Set([
  '@asol/data-core/browser',
  '@asol/data-core/ota',
  '@asol/native-core',
]);

/**
 * Modules the inversion removed. Re-importing any of them undoes the work, so they are
 * named explicitly rather than merely absent from the allow-list — a failure that says
 * "this was inverted on purpose" is worth more than one that says "not declared".
 */
const INVERTED_AWAY = [
  '@/features/categories',
  '@/core/config/app-version',
  '@/core/config/public-env',
  '@/core/api',
  '@/features/auth/utils/super-admin',
  '@/features/system-logs/entities/persistent-system-log.entity',
  '@/features/system-logs/pre-auth-failure-reporter',
  '@/features/system-logs/services/persistent-system-log-api-service',
  '@/features/system-logs/services/persistent-system-log-service.server',
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'tests') out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

export async function runAppEdgeTests(): Promise<void> {
  const found = new Map<string, string>();

  for (const file of sourceFiles(PACKAGE_SRC)) {
    const content = readFileSync(file, 'utf8');
    for (const match of content.matchAll(/\bfrom\s+['"](@\/[^'"]+)['"]/g)) {
      const specifier = match[1];
      if (!found.has(specifier)) found.set(specifier, file);

      const reverted = INVERTED_AWAY.find((edge) => specifier === edge);
      if (reverted) {
        throw new Error(
          `ota-core app-edge contract: ${path.relative(process.cwd(), file)} imports ` +
            `"${reverted}", which was deliberately inverted into a port.\n` +
            `Use the port in packages/ota-core/src/ports and register the implementation ` +
            `in src/features/ota/ota-core-ports.ts instead of importing the feature.`,
        );
      }

      if (!DECLARED_APP_EDGES.has(specifier)) {
        throw new Error(
          `ota-core app-edge contract: ${path.relative(process.cwd(), file)} imports ` +
            `"${specifier}", which is not a declared edge into the application.\n` +
            `Rule 7 runs both ways: a package must not quietly grow new knowledge of the ` +
            `app. Invert the dependency, or add it to DECLARED_APP_EDGES on purpose.`,
        );
      }
    }
  }

  // Package doors get the same treatment as app edges: declared, and only through a door.
  const doorsFound = new Set<string>();
  for (const file of sourceFiles(PACKAGE_SRC)) {
    for (const match of readFileSync(file, 'utf8').matchAll(/\bfrom\s+['"](@asol\/[^'"]+)['"]/g)) {
      if (match[1].startsWith('@asol/ota-core')) continue;
      doorsFound.add(match[1]);
      if (!DECLARED_PACKAGE_DOORS.has(match[1])) {
        throw new Error(
          `ota-core app-edge contract: ${path.relative(process.cwd(), file)} imports ` +
            `"${match[1]}", which is not a declared package door.`,
        );
      }
    }
  }

  // A declared edge that no longer exists must be removed, or the list stops describing
  // reality and stops being a budget.
  const stale = [...DECLARED_APP_EDGES].filter((edge) => !found.has(edge));
  if (stale.length > 0) {
    throw new Error(
      `ota-core app-edge contract: ${stale.join(', ')} no longer imported. ` +
        `Delete them from DECLARED_APP_EDGES — a budget with unspent room silently allows ` +
        `the coupling back.`,
    );
  }

  // The ports must actually exist and default safely: this inversion is only safe to ship
  // because a missing registration degrades instead of breaking updates.
  const { otaIdentity, otaTelemetry, resetOtaCorePorts } = await import('../../ports');
  resetOtaCorePorts();
  if (otaIdentity().isSuperAdmin('any-uid', 'any-phone') !== false) {
    throw new Error('ota-core ports: the default identity must fail closed');
  }
  if ((await otaTelemetry().list({ limit: 10 })).length !== 0) {
    throw new Error('ota-core ports: the default telemetry must return no logs');
  }
  otaTelemetry().reportFailure('contract-probe', new Error('probe'));

  console.log(
    `  ✔ ota-core app edges pinned at ${found.size} (was 10; ${INVERTED_AWAY.length} inverted into ports).`,
  );
}
