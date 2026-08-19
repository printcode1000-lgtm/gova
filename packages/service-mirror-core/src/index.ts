import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import { builtinModules } from 'module';

export interface ServiceMirrorOptions {
  serviceName: 'notifications' | 'products' | 'orders' | 'profiles';
  serviceDir: string;
  entryPoints: readonly string[];
  runtimeAssets?: readonly string[];
  outOverride?: string | null;
}

const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.json', '.js'];

const SPECIFIER_PATTERNS = [
  /\bfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // Any identifier ending in `require` — `require(...)`, and also `nodeRequire(...)`, the
  // `createRequire` handle an ES module has to build for itself. `\brequire` matched only the
  // bare name, so when `@asol/data-core` became an ES module and renamed its lazy loader, every
  // database driver silently dropped out of all four service mirrors: the deployments still
  // built, and would have failed at the first query with "Cannot find module". A walker that
  // misses an edge produces an upload that looks complete, which is the worst failure it has.
  /(?:^|[^\w$.])[\w$]*[Rr]equire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

export function readOutputOverride(): string | null {
  const index = process.argv.indexOf('--out');
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value) throw new Error('--out requires a directory path');
  return path.resolve(value);
}

export function collectSpecifiers(content: string): string[] {
  const found = new Set<string>();
  for (const pattern of SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) found.add(match[1]);
  }
  return [...found];
}

/**
 * Resolves an `@asol/<package>` or `@asol/<package>/<door>` specifier through the
 * workspace package's own `exports` map.
 *
 * These are workspace packages, not npm packages. Treating them as npm — which this
 * walker did until it broke all four accounts — leaves the specifier unresolved in the
 * uploaded folder, and the remote Vercel build fails with "Can't resolve
 * '@asol/storage-core'". The service folder is uploaded alone, so nothing outside it
 * exists at build time and no `node_modules` symlink is there to save it.
 *
 * Resolution goes through `exports` deliberately: a door that is not declared there is
 * not importable, exactly as rule 5 intends. Mirroring must not become the side door
 * that the seal was built to prevent.
 */
export function resolveWorkspacePackage(specifier: string, packagesRoot: string): string | null {
  if (!specifier.startsWith('@asol/')) return null;

  const withoutScope = specifier.slice('@asol/'.length);
  const slash = withoutScope.indexOf('/');
  const packageName = slash === -1 ? withoutScope : withoutScope.slice(0, slash);
  const door = slash === -1 ? '.' : `./${withoutScope.slice(slash + 1)}`;

  const manifestPath = path.join(packagesRoot, packageName, 'package.json');
  if (!existsSync(manifestPath)) return null;

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    exports?: Record<string, string | { default?: string; types?: string }>;
  };
  const entry = manifest.exports?.[door];
  if (!entry) {
    throw new Error(
      `"${specifier}" is not a declared door of @asol/${packageName}. ` +
        `Declared doors: ${Object.keys(manifest.exports ?? {}).join(', ') || 'none'}.`,
    );
  }

  const target = typeof entry === 'string' ? entry : entry.default ?? entry.types;
  if (!target) return null;

  const resolved = path.join(packagesRoot, packageName, target);
  return existsSync(resolved) ? resolved : null;
}

export function resolveModule(
  specifier: string,
  importerAbsolutePath: string,
  sourceRoot: string,
  packagesRoot?: string,
): string | null {
  if (packagesRoot && specifier.startsWith('@asol/')) {
    return resolveWorkspacePackage(specifier, packagesRoot);
  }

  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;

  const base = specifier.startsWith('@/')
    ? path.join(sourceRoot, specifier.slice(2))
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

/** Every `.ts`/`.tsx` file under the service's own, hand-written `src/`. */
export function collectServiceSourceFiles(serviceSrc: string): string[] {
  if (!existsSync(serviceSrc)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(serviceSrc, { withFileTypes: true })) {
    const full = path.join(serviceSrc, entry.name);
    if (entry.isDirectory()) out.push(...collectServiceSourceFiles(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

export function walkGraph(
  entryPoints: readonly string[],
  root: string,
  sourceRoot: string,
  publicRoot: string,
  packagesRoot?: string,
  serviceOwnFiles: readonly string[] = [],
  serviceSrcRoot?: string,
): Set<string> {
  const visited = new Set<string>();
  const queue: string[] = [];

  for (const entry of entryPoints) {
    const absolute = path.join(sourceRoot, entry);
    if (!existsSync(absolute)) {
      throw new Error(`Entry point missing: ${entry}`);
    }
    queue.push(absolute);
  }

  // Walked for what they reach, never copied: they are already inside the uploaded folder.
  const serviceOwn = new Set(serviceOwnFiles);
  queue.push(...serviceOwnFiles);

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);

    if (current.endsWith('.json')) continue;

    const content = readFileSync(current, 'utf8');
    for (const specifier of collectSpecifiers(content)) {
      const resolved = resolveModule(specifier, current, sourceRoot, packagesRoot);
      if (!resolved) continue;
      const insideAllowedRoot =
        resolved.startsWith(sourceRoot) ||
        resolved.startsWith(publicRoot) ||
        (packagesRoot !== undefined && resolved.startsWith(packagesRoot)) ||
        // The service's own src/ — reachable from its routes, already inside the upload.
        (serviceSrcRoot !== undefined && resolved.startsWith(serviceSrcRoot));
      if (!insideAllowedRoot) {
        throw new Error(
          `${path.relative(root, current)} imports outside src/, public/ and packages/: ${specifier}`,
        );
      }
      if (!visited.has(resolved)) queue.push(resolved);
    }
  }

  for (const own of serviceOwn) visited.delete(own);
  return visited;
}

/**
 * Rewrites the service tsconfig's `paths` so the mirrored workspace packages resolve
 * inside the uploaded folder.
 *
 * The mapping is regenerated from the packages actually reached this run, so a package
 * that drops out of the graph also drops out of the tsconfig. `@/*` is preserved
 * untouched — it is the service's own source alias and is not ours to rewrite.
 */
export function writeWorkspacePackagePaths(
  serviceDir: string,
  outputRoot: string,
  packagesRoot: string,
  mirroredPackages: ReadonlySet<string>,
): void {
  const tsconfigPath = path.join(serviceDir, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) return;

  const raw = readFileSync(tsconfigPath, 'utf8');
  const tsconfig = JSON.parse(raw) as {
    compilerOptions?: { paths?: Record<string, string[]> };
  };
  const compilerOptions = (tsconfig.compilerOptions ??= {});
  const previous = compilerOptions.paths ?? {};

  const paths: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(previous)) {
    if (!key.startsWith('@asol/')) paths[key] = value;
  }

  const relativeOut = path.relative(serviceDir, outputRoot).split(path.sep).join('/') || '.';
  for (const name of [...mirroredPackages].sort()) {
    const manifest = JSON.parse(
      readFileSync(path.join(packagesRoot, name, 'package.json'), 'utf8'),
    ) as { exports?: Record<string, string | { default?: string; types?: string }> };

    for (const [door, entry] of Object.entries(manifest.exports ?? {})) {
      const target = typeof entry === 'string' ? entry : entry.default ?? entry.types;
      if (!target) continue;
      const specifier = door === '.' ? `@asol/${name}` : `@asol/${name}/${door.slice(2)}`;
      const file = target.replace(/^\.\//, '');
      paths[specifier] = [`./${relativeOut}/packages/${name}/${file}`];
    }
  }

  compilerOptions.paths = paths;
  const next = `${JSON.stringify(tsconfig, null, 2)}\n`;
  if (next !== raw) writeFileSync(tsconfigPath, next, 'utf8');
}

// Taken from the running Node rather than hand-listed: a hand-written list is exactly
// how `async_hooks` got flagged as a missing npm package on the first run of this guard.
const NODE_BUILTINS = new Set(builtinModules);

/**
 * Package names the service's `next.config.ts` resolves itself, via `turbopack.resolveAlias`
 * or `serverExternalPackages`.
 *
 * `better-sqlite3` is the standing case: the shared data-access code keeps a local-SQLite
 * branch for main-app development, and each service aliases it to `stubs/better-sqlite3.js`
 * because that branch is unreachable in a Turso-only deployment. It is resolved, just not
 * through `package.json` — so requiring it as a declared dependency would be wrong.
 */
function aliasedPackages(serviceDir: string): Set<string> {
  const configPath = path.join(serviceDir, 'next.config.ts');
  if (!existsSync(configPath)) return new Set();
  const content = readFileSync(configPath, 'utf8');
  const names = new Set<string>();
  const aliasBlock = content.match(/resolveAlias\s*:\s*\{([\s\S]*?)\}/);
  if (aliasBlock) {
    for (const match of aliasBlock[1].matchAll(/['"]([^'"]+)['"]\s*:/g)) names.add(match[1]);
  }
  const externals = content.match(/serverExternalPackages\s*:\s*\[([\s\S]*?)\]/);
  if (externals) {
    for (const match of externals[1].matchAll(/['"]([^'"]+)['"]/g)) names.add(match[1]);
  }
  return names;
}

/**
 * Fails the sync when a mirrored file imports an npm package the service does not declare.
 *
 * This is the check whose absence broke all four accounts at once. The service folder is
 * uploaded alone and installed against its own `package.json`, so a bare specifier that
 * the root has but the service does not resolves fine on this machine and fails on
 * Vercel — after the git push, which is the worst possible place to find out.
 *
 * Catching it here turns a failed production deploy into a failed local `services:sync`.
 */
export function assertBareSpecifiersAreDeclared(
  serviceDir: string,
  files: readonly string[],
  packagesRoot: string,
): void {
  const manifestPath = path.join(serviceDir, 'package.json');
  if (!existsSync(manifestPath)) return;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const declared = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...aliasedPackages(serviceDir),
  ]);

  const missing = new Map<string, string>();
  for (const file of files) {
    if (!/\.(ts|tsx|js)$/.test(file)) continue;
    for (const specifier of collectSpecifiers(readFileSync(file, 'utf8'))) {
      if (specifier.startsWith('.') || specifier.startsWith('@/')) continue;
      if (specifier.startsWith('node:')) continue;
      if (NODE_BUILTINS.has(specifier)) continue;
      // `@asol/*` is resolved and mirrored by this walker, then mapped in the tsconfig.
      if (specifier.startsWith('@asol/')) {
        const name = specifier.slice('@asol/'.length).split('/')[0];
        if (existsSync(path.join(packagesRoot, name, 'package.json'))) continue;
      }
      const packageName = specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0];
      if (!declared.has(packageName)) missing.set(packageName, file);
    }
  }

  if (missing.size > 0) {
    const detail = [...missing]
      .map(([name, file]) => `  ${name}  (first seen in ${path.basename(file)})`)
      .join('\n');
    throw new Error(
      `${path.basename(serviceDir)}: mirrored code imports npm packages this service does not declare.\n` +
        `${detail}\n` +
        `Add them to ${path.relative(process.cwd(), manifestPath)} — the uploaded folder installs ` +
        `against that file alone, so the remote build cannot see the root's dependencies.`,
    );
  }
}

export function syncServiceMirror(options: ServiceMirrorOptions): { fileCount: number; assetCount: number } {
  const root = process.cwd();
  const sourceRoot = path.join(root, 'src');
  const publicRoot = path.join(root, 'public');

  const serviceDir = path.isAbsolute(options.serviceDir)
    ? options.serviceDir
    : path.join(root, options.serviceDir);

  const outOverride = options.outOverride ?? readOutputOverride();
  const outputRoot = outOverride ?? path.join(serviceDir, 'generated');
  const targetRoot = path.join(outputRoot, 'src');

  const packagesRoot = path.join(root, 'packages');
  const packagesTargetRoot = path.join(outputRoot, 'packages');

  rmSync(targetRoot, { recursive: true, force: true });
  rmSync(path.join(outputRoot, 'public'), { recursive: true, force: true });
  rmSync(packagesTargetRoot, { recursive: true, force: true });

  const runtimeAssets = options.runtimeAssets ?? [];
  let assetCount = 0;
  for (const relative of runtimeAssets) {
    const source = path.join(root, relative);
    if (!existsSync(source)) throw new Error(`Runtime asset missing: ${relative}`);
    const destination = path.join(serviceDir, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    assetCount++;
  }

  // The service's own `src/` is uploaded verbatim, so it was never mirrored — and was
  // therefore never walked either. That blind spot meant a route importing `@asol/*`
  // produced a green sync and a failed remote build. Its route files are entry points
  // too: they are not copied, but what they reach must be.
  const serviceOwnFiles = collectServiceSourceFiles(path.join(serviceDir, 'src'));

  const files = [
    ...walkGraph(
      options.entryPoints,
      root,
      sourceRoot,
      publicRoot,
      packagesRoot,
      serviceOwnFiles,
      path.join(serviceDir, 'src'),
    ),
  ].sort();
  const mirroredPackages = new Set<string>();
  for (const file of files) {
    let destination: string;
    if (file.startsWith(publicRoot)) {
      destination = path.join(outputRoot, 'public', path.relative(publicRoot, file));
    } else if (file.startsWith(packagesRoot)) {
      const relative = path.relative(packagesRoot, file);
      mirroredPackages.add(relative.split(path.sep)[0]);
      destination = path.join(packagesTargetRoot, relative);
    } else {
      destination = path.join(targetRoot, path.relative(sourceRoot, file));
    }
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(file, destination);
  }

  // Each mirrored package needs its `package.json` too: it carries the `exports` map,
  // and the tsconfig paths written below point at the doors that map declares.
  for (const name of mirroredPackages) {
    const manifestSource = path.join(packagesRoot, name, 'package.json');
    const manifestDestination = path.join(packagesTargetRoot, name, 'package.json');
    mkdirSync(path.dirname(manifestDestination), { recursive: true });
    copyFileSync(manifestSource, manifestDestination);
  }

  // Only a real sync may touch the service folder. Under `--out <throwaway>` this is the
  // drift check, and a check that writes to what it measures fails exactly once — it would
  // have stamped the throwaway temp path into the tracked tsconfig. It did, once.
  if (outOverride === null) {
    writeWorkspacePackagePaths(serviceDir, outputRoot, packagesRoot, mirroredPackages);
  }
  assertBareSpecifiersAreDeclared(serviceDir, files, packagesRoot);

  const useSourceRelativeManifest = options.serviceName === 'notifications';
  const manifestFiles = files
    .map((file) => {
      const rel = useSourceRelativeManifest && file.startsWith(sourceRoot)
        ? path.relative(sourceRoot, file)
        : path.relative(root, file);
      return rel.split(path.sep).join('/');
    })
    .sort();

  const manifest = {
    generatedAt: new Date().toISOString(),
    entryPoints: options.entryPoints,
    fileCount: files.length,
    files: manifestFiles,
  };

  mkdirSync(outputRoot, { recursive: true });
  writeFileSync(
    path.join(outputRoot, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  const assetSummary = assetCount > 0 ? ` and ${assetCount} runtime asset(s)` : '';
  console.log(`Synced ${files.length} shared modules${assetSummary} into ${path.relative(root, serviceDir)}`);

  return { fileCount: files.length, assetCount };
}
