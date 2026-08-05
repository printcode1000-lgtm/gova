import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import path from 'path';

/**
 * Copies the shared modules the products service needs into its own folder.
 *
 * The service is deployed from `services/products` alone — nothing outside
 * that folder is uploaded — so it cannot import from `../../src` at build time.
 * Rather than maintaining a second copy of the send logic by hand, this walks
 * the real import graph from the route's entry points and mirrors exactly the
 * files it reaches into `generated/src`.
 *
 * The output is generated, git-ignored, and rebuilt on every deploy, so the two
 * copies cannot drift the way a hand-maintained fork would. This mirrors the
 * existing `data-access:sync-public` pattern for `public/asol-push-sw.js`.
 */

const ROOT = process.cwd();
const SOURCE_ROOT = path.join(ROOT, 'src');
const PUBLIC_ROOT = path.join(ROOT, 'public');
const SERVICE_ROOT = path.join(ROOT, 'services', 'products');

/**
 * Output root, overridable with `--out <dir>`.
 *
 * The contract test points it at a throwaway directory so it can detect drift
 * without repairing it — a check that fixes what it measures would only ever
 * fail once.
 */
function readOutputOverride(): string | null {
  const index = process.argv.indexOf('--out');
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value) throw new Error('--out requires a directory path');
  return path.resolve(value);
}

const OUTPUT_ROOT = readOutputOverride() ?? path.join(SERVICE_ROOT, 'generated');
const TARGET_ROOT = path.join(OUTPUT_ROOT, 'src');

/**
 * Everything the read routes import. Anything reachable from here is copied;
 * anything not reachable is deliberately absent, which is what keeps the users,
 * profile, and orders data-access code out of the products deployment.
 */
const ENTRY_POINTS = [
  'features/product/services/product-service.server.ts',
  'features/product/services/product-review-service.server.ts',
  'features/product-search/services/product-search-products.server.ts',
  'features/product-search/services/product-search-fields.server.ts',
  'features/categories/index.ts',
  'core/config/server-env.ts',
];

const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.json', '.js'];

function resolveModule(specifier: string, importerAbsolutePath: string): string | null {
  // Bare specifiers are npm packages: they come from the service's own
  // package.json, not from this repository's source tree.
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;

  const base = specifier.startsWith('@/')
    ? path.join(SOURCE_ROOT, specifier.slice(2))
    : path.resolve(path.dirname(importerAbsolutePath), specifier);

  const candidates = [
    base,
    ...RESOLVE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...RESOLVE_EXTENSIONS.map((extension) => path.join(base, `index${extension}`)),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * Static imports/exports plus `require("...")`.
 *
 * The require form matters: `data-source-registry.ts` picks its database client
 * through a lazy `require`, so a walker that only understood `import` would copy
 * a registry whose branches are all missing.
 */
const SPECIFIER_PATTERNS = [
  /\bfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function collectSpecifiers(content: string): string[] {
  const found = new Set<string>();
  for (const pattern of SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) found.add(match[1]);
  }
  return [...found];
}

function walk(): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [];

  for (const entry of ENTRY_POINTS) {
    const absolute = path.join(SOURCE_ROOT, entry);
    if (!existsSync(absolute)) {
      throw new Error(`Entry point missing: ${entry}`);
    }
    queue.push(absolute);
  }

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);

    if (current.endsWith('.json')) continue;

    const content = readFileSync(current, 'utf8');
    for (const specifier of collectSpecifiers(content)) {
      const resolved = resolveModule(specifier, current);
      if (!resolved) continue;
      if (!resolved.startsWith(SOURCE_ROOT) && !resolved.startsWith(PUBLIC_ROOT)) {
        throw new Error(
          `${path.relative(ROOT, current)} imports outside src/ and public/: ${specifier}`,
        );
      }
      if (!visited.has(resolved)) queue.push(resolved);
    }
  }

  return visited;
}

/**
 * Where a mirrored file lands.
 *
 * The category loader imports its JSON from `public/` with a relative path that
 * climbs out of `src/`. Mirroring `src/` under `generated/src` and `public/`
 * under `generated/public` keeps that climb resolving to the same depth, so the
 * import needs no rewriting.
 */
function destinationFor(file: string): string {
  if (file.startsWith(PUBLIC_ROOT)) {
    return path.join(OUTPUT_ROOT, 'public', path.relative(PUBLIC_ROOT, file));
  }
  return path.join(TARGET_ROOT, path.relative(SOURCE_ROOT, file));
}

/**
 * Files read at runtime through `fs`, which an import walker cannot see.
 *
 * `storage-profile-loader.server.ts` resolves this from `process.cwd()`, so the
 * service needs its own copy at the same relative path or page-data collection
 * fails with ENOENT — during the build, not at request time, which is at least
 * the right place to find out.
 */
const RUNTIME_ASSETS = ['src/config/storage-profiles.json'] as const;

function copyRuntimeAssets(): number {
  for (const relative of RUNTIME_ASSETS) {
    const source = path.join(ROOT, relative);
    if (!existsSync(source)) throw new Error(`Runtime asset missing: ${relative}`);
    const destination = path.join(SERVICE_ROOT, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
  return RUNTIME_ASSETS.length;
}

function main(): void {
  rmSync(TARGET_ROOT, { recursive: true, force: true });
  rmSync(path.join(OUTPUT_ROOT, 'public'), { recursive: true, force: true });

  const assetCount = copyRuntimeAssets();
  const files = [...walk()].sort();
  for (const file of files) {
    const destination = destinationFor(file);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(file, destination);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    entryPoints: ENTRY_POINTS,
    fileCount: files.length,
    files: files
      .map((file) => path.relative(ROOT, file).split(path.sep).join('/'))
      .sort(),
  };
  mkdirSync(OUTPUT_ROOT, { recursive: true });
  writeFileSync(
    path.join(OUTPUT_ROOT, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  console.log(`Synced ${files.length} shared modules and ${assetCount} runtime asset(s) into ${path.relative(ROOT, SERVICE_ROOT)}`);
}

main();
