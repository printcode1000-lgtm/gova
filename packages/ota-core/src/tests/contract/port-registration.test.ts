import { readFileSync, readdirSync } from 'fs';
import path from 'path';

/**
 * Every application module that touches the OTA runtime must register the ports.
 *
 * This exists because the first version of the inversion registered them in
 * `SettingsPageContent` alone — and `SplashInitializer` calls
 * `otaUpdateService.prepareAtSplash()` at app start, long before that component mounts.
 * The ports were therefore still at their defaults during the splash, so the super-admin
 * predicate returned `false` for an actual super admin.
 *
 * It failed silently and correctly-looking, which is the worst combination: the safe
 * default that makes the inversion shippable is the same property that hides a missing
 * registration. Convention cannot carry that; a check has to.
 *
 * The rule: importing the OTA **runtime** surface obliges you to import the browser composition
 * root, which is where every client-side port registration now lives.
 * Type-only imports and the publishing/server entries are exempt — they do not run in the
 * client, and the server half registers itself in `src/features/ota/server.ts`.
 */

const APP_SRC = path.join(process.cwd(), 'src');
const SEAM = '@/core/composition/browser-ports';
const SEAM_CALL = /registerBrowserPorts\(\s*\)/;

/** Runtime symbols whose behaviour depends on a registered port. */
const RUNTIME_SYMBOLS = ['useOtaUpdate', 'otaUpdateService', 'otaRevocationService'];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'tests' && entry.name !== 'node_modules') out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

export async function runPortRegistrationTests(): Promise<void> {
  let checked = 0;

  for (const file of sourceFiles(APP_SRC)) {
    const relative = path.relative(process.cwd(), file).split(path.sep).join('/');
    // The seam itself, and the server half, are the registration — not consumers of it.
    if (relative.startsWith('src/features/ota/')) continue;

    const content = readFileSync(file, 'utf8');
    // Every import statement that pulls from the package's main door.
    const otaImports = [
      ...content.matchAll(
        /import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]@asol\/ota-core['"]/g,
      ),
    ];
    const importsRuntime = otaImports.some(
      ([, typeOnly, named]) =>
        !typeOnly && RUNTIME_SYMBOLS.some((symbol) => named.includes(symbol)),
    );

    if (!importsRuntime) continue;
    checked += 1;

    if (!content.includes(SEAM)) {
      throw new Error(
        `ota-core port registration: ${relative} uses the OTA runtime but never imports\n` +
          `"${SEAM}". Without the registration the ports stay at their defaults — telemetry\n` +
          `is silently dropped and the super-admin predicate returns false for everyone.\n` +
          `Add \`import { registerBrowserPorts } from "${SEAM}";\` and call it at module load.`,
      );
    }
    if (!SEAM_CALL.test(content)) {
      throw new Error(
        `ota-core port registration: ${relative} imports the seam but never calls\n` +
          `registerBrowserPorts(). An unused import registers nothing.`,
      );
    }
  }

  // The root is only a valid seam while it still registers *these* ports. Without this the
  // check above would keep passing after someone dropped OTA from the composition root.
  const rootSource = readFileSync(
    path.join(process.cwd(), 'src/core/composition/browser-ports.ts'),
    'utf8',
  );
  const importsOtaPorts =
    rootSource.includes('@/features/ota/ota-core-ports') ||
    /from\s+['"]@\/features\/ota['"]/.test(rootSource) ||
    /from\s+['"]@\/features\/ota\/index['"]/.test(rootSource);
  if (!/registerOtaCorePorts\(\s*\)/.test(rootSource) || !importsOtaPorts) {
    throw new Error(
      'ota-core port registration: the browser composition root no longer calls ' +
        'registerOtaCorePorts(). Every consumer would still pass this check while the ports ' +
        'stay at their defaults — which is the exact failure this test exists for.',
    );
  }

  if (checked === 0) {
    throw new Error(
      'ota-core port registration: found no OTA runtime consumers to check. ' +
        'Either the symbol list is stale or the scan is broken — a check that examines ' +
        'nothing passes for the wrong reason.',
    );
  }

  console.log(`  ✔ ota-core ports registered by all ${checked} OTA runtime consumers.`);
}
