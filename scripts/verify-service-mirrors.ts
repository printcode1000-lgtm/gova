/**
 * Mirror completeness — the check that catches an upload which only *looks* complete.
 *
 * `services:sync` walks the import graph and copies what it finds. `services:build` then builds
 * each service the way Vercel does. Between those two there is a gap neither one covers: a
 * specifier the walker failed to recognise is never copied, and a bundler that resolves it
 * lazily never complains at build time. The deployment goes out green and fails at the first
 * request with "Cannot find module".
 *
 * That is not hypothetical. When `@asol/data-core` became an ES module its lazy driver loads
 * changed from `require(...)` to a `createRequire` handle named `nodeRequire(...)`, the walker's
 * pattern stopped matching, and every database driver silently dropped out of all four mirrors.
 * All four still built.
 *
 * So this script re-reads the uploaded tree and resolves every edge inside it — relative paths,
 * `@/` paths, and `@asol/<package>[/door]` specifiers through the mirrored package's own
 * `exports` map. Anything that points at a file the upload does not contain is a missing module,
 * reported per service with the file that wanted it.
 *
 * Run by `npm run services:verify`, in `deploy:all` preflight, and in CI.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { collectSpecifiers } from '@asol/service-mirror-core';

const ROOT = process.cwd();
const SERVICES = ['notifications', 'products', 'orders', 'profiles', 'submain', 'sub2main'] as const;

const CODE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs'];
const RESOLUTION_SUFFIXES = [
  '',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.mjs',
  '.json',
  '/index.ts',
  '/index.tsx',
  '/index.js',
];

interface Missing {
  readonly importer: string;
  readonly specifier: string;
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, out);
    } else if (CODE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function fileExists(candidate: string): boolean {
  return existsSync(candidate) && statSync(candidate).isFile();
}

function resolveWithSuffixes(base: string): string | null {
  for (const suffix of RESOLUTION_SUFFIXES) {
    if (fileExists(base + suffix)) return base + suffix;
  }
  return null;
}

/**
 * Resolves `@asol/<package>` and `@asol/<package>/<door>` against the **mirrored** manifest.
 *
 * Going through `exports` is the point: a door that the package does not declare is not
 * importable, and a mirror that resolved it anyway would become the side door the seal exists to
 * prevent. An undeclared door is reported as missing here rather than quietly resolved by path.
 */
function resolveAsolSpecifier(specifier: string, packagesRoot: string): string | null {
  const withoutScope = specifier.slice('@asol/'.length);
  const [packageName, ...doorParts] = withoutScope.split('/');
  const manifestPath = path.join(packagesRoot, packageName, 'package.json');
  if (!fileExists(manifestPath)) return null;

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    exports?: Record<string, { types?: string; default?: string } | string>;
    main?: string;
  };
  const door = doorParts.length === 0 ? '.' : `./${doorParts.join('/')}`;
  const entry = manifest.exports?.[door];
  const target =
    typeof entry === 'string' ? entry : (entry?.types ?? entry?.default ?? (door === '.' ? manifest.main : undefined));
  if (!target) return null;

  return resolveWithSuffixes(path.join(packagesRoot, packageName, target));
}

function verifyService(service: string): Missing[] {
  const serviceDir = path.join(ROOT, 'services', service);
  const generated = path.join(serviceDir, 'generated');
  const generatedSrc = path.join(generated, 'src');
  const packagesRoot = path.join(generated, 'packages');

  if (!existsSync(generated)) {
    throw new Error(
      `services/${service}/generated is missing. Run "npm run services:sync" first — the mirror is ` +
        'git-ignored, so a clean checkout has none.',
    );
  }

  // Both trees ship: `generated/` is the mirrored shared code, `src/` is the service's own routes.
  const files = [...walk(generated), ...walk(path.join(serviceDir, 'src'))];
  const missing: Missing[] = [];

  for (const file of files) {
    for (const specifier of collectSpecifiers(readFileSync(file, 'utf8'))) {
      let resolved: string | null = null;

      if (specifier.startsWith('.')) {
        resolved = resolveWithSuffixes(path.resolve(path.dirname(file), specifier));
      } else if (specifier.startsWith('@/')) {
        resolved = resolveWithSuffixes(path.join(generatedSrc, specifier.slice(2)));
      } else if (specifier.startsWith('@asol/')) {
        resolved = resolveAsolSpecifier(specifier, packagesRoot);
      } else {
        // A bare npm specifier. `services:sync` already fails when one is not declared in the
        // service's own package.json, so re-checking it here would duplicate that gate.
        continue;
      }

      if (!resolved) {
        missing.push({ importer: path.relative(ROOT, file).split(path.sep).join('/'), specifier });
      }
    }
  }

  return missing;
}

function main(): void {
  let failed = false;

  for (const service of SERVICES) {
    const missing = verifyService(service);
    if (missing.length === 0) {
      console.log(`[services:verify] ${service}: every module edge resolves inside the upload.`);
      continue;
    }

    failed = true;
    console.error(
      `[services:verify] ${service}: ${missing.length} module(s) imported but not present in the upload:`,
    );
    for (const entry of missing) {
      console.error(`  - ${entry.specifier}  (imported by ${entry.importer})`);
    }
  }

  if (failed) {
    console.error(
      '\n[services:verify] A missing module here does not fail the remote build — it fails the ' +
        'first request that reaches it. Fix the walker in packages/service-mirror-core or the ' +
        'import that it cannot see, then re-run "npm run services:sync".',
    );
    process.exit(1);
  }

  console.log('[services:verify] All 6 service uploads are complete.');
}

main();
