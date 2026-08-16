import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import path from 'path';

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
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
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

export function resolveModule(
  specifier: string,
  importerAbsolutePath: string,
  sourceRoot: string,
): string | null {
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

export function walkGraph(
  entryPoints: readonly string[],
  root: string,
  sourceRoot: string,
  publicRoot: string,
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

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);

    if (current.endsWith('.json')) continue;

    const content = readFileSync(current, 'utf8');
    for (const specifier of collectSpecifiers(content)) {
      const resolved = resolveModule(specifier, current, sourceRoot);
      if (!resolved) continue;
      if (!resolved.startsWith(sourceRoot) && !resolved.startsWith(publicRoot)) {
        throw new Error(
          `${path.relative(root, current)} imports outside src/ and public/: ${specifier}`,
        );
      }
      if (!visited.has(resolved)) queue.push(resolved);
    }
  }

  return visited;
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

  rmSync(targetRoot, { recursive: true, force: true });
  rmSync(path.join(outputRoot, 'public'), { recursive: true, force: true });

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

  const files = [...walkGraph(options.entryPoints, root, sourceRoot, publicRoot)].sort();
  for (const file of files) {
    let destination: string;
    if (file.startsWith(publicRoot)) {
      destination = path.join(outputRoot, 'public', path.relative(publicRoot, file));
    } else {
      destination = path.join(targetRoot, path.relative(sourceRoot, file));
    }
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(file, destination);
  }

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
