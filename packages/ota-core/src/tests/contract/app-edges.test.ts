import { readFileSync, readdirSync } from 'fs';
import path from 'path';

/**
 * Pins every edge from `@asol/ota-core` into the application.
 *
 * Rule 7 says other modules depend on a package and know nothing of its internals. The
 * reverse is just as binding and is where this package fails: it reaches back into the
 * application in fourteen places — database access, auth, system logging, the API client.
 *
 * **This test does not fix that.** Inverting those dependencies means injecting ports for
 * storage, auth and logging through the whole OTA runtime, and it is a change that has to
 * be verified against a real release. What this test does is stop the coupling from
 * growing quietly: every edge is listed, and adding one is a deliberate edit to this file
 * rather than an import someone adds without noticing.
 *
 * The list should only ever shrink.
 */

const PACKAGE_SRC = path.join(process.cwd(), 'packages/ota-core/src');

/** Every `@/` module `ota-core` is currently allowed to import. Shrink, never grow. */
const DECLARED_APP_EDGES = new Set([
  '@/core/api',
  '@/core/config/public-env',
  '@/features/auth/utils/super-admin',
  '@/features/categories',
  '@/features/system-logs/entities/persistent-system-log.entity',
  '@/features/system-logs/pre-auth-failure-reporter',
  '@/features/system-logs/services/persistent-system-log-api-service',
  '@/features/system-logs/services/persistent-system-log-service.server',
  '@/modules/data-access/browser/asol-db',
  '@/modules/data-access/domains/ota/index.server',
]);

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
      if (!DECLARED_APP_EDGES.has(specifier)) {
        throw new Error(
          `ota-core app-edge contract: ${path.relative(process.cwd(), file)} imports ` +
            `"${specifier}", which is not a declared edge into the application.\n` +
            `Rule 7 runs both ways: a package must not quietly grow new knowledge of the app. ` +
            `Invert the dependency, or add it to DECLARED_APP_EDGES on purpose.`,
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
        `Delete them from DECLARED_APP_EDGES — the list is a budget, and a budget with ` +
        `unspent room in it silently allows the coupling back.`,
    );
  }

  console.log(`  ✔ ota-core app edges pinned at ${found.size} (budget: ${DECLARED_APP_EDGES.size}).`);
}
