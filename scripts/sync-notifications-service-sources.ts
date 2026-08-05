import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import path from 'path';

/**
 * Copies the shared modules the notifications service needs into its own folder.
 *
 * The service is deployed from `services/notifications` alone — nothing outside
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
const TARGET_ROOT = path.join(ROOT, 'services', 'notifications', 'generated', 'src');

/**
 * Everything the two API routes import. Anything reachable from here is copied;
 * anything not reachable is deliberately absent, which is what keeps the users
 * and product data-access code out of the notifications deployment.
 */
const ENTRY_POINTS = [
  'features/notifications/services/notification-send-service.server.ts',
  'features/notifications/domain/entities.ts',
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
      if (!resolved.startsWith(SOURCE_ROOT)) {
        throw new Error(
          `${path.relative(ROOT, current)} imports outside src/: ${specifier}`,
        );
      }
      if (!visited.has(resolved)) queue.push(resolved);
    }
  }

  return visited;
}

function main(): void {
  rmSync(TARGET_ROOT, { recursive: true, force: true });

  const files = [...walk()].sort();
  for (const file of files) {
    const relative = path.relative(SOURCE_ROOT, file);
    const destination = path.join(TARGET_ROOT, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(file, destination);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    entryPoints: ENTRY_POINTS,
    fileCount: files.length,
    files: files.map((file) => path.relative(SOURCE_ROOT, file).split(path.sep).join('/')).sort(),
  };
  writeFileSync(
    path.join(ROOT, 'services', 'notifications', 'generated', 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  console.log(`Synced ${files.length} shared modules into services/notifications/generated/src`);
}

main();
