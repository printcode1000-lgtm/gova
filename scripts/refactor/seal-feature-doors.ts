/**
 * Analyze cross-feature deep imports and emit sealed public doors
 * (`index.ts` / `ui.ts` / `server.ts`) plus rewrite importers to use them.
 *
 * Internal same-feature imports are left untouched.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  appendFileSync,
} from 'fs';
import { dirname, join, relative } from 'path';

const ROOT = process.cwd();
const FEATURES = join(ROOT, 'src/features');
const SKIP = new Set(['node_modules', '.git', '.next', 'out', 'android', 'ios']);

type DoorKind = 'index' | 'ui' | 'server';

interface CrossImport {
  importer: string;
  importerFeature: string | null;
  targetFeature: string;
  specifier: string;
  resolvedRel: string;
  door: DoorKind;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

function featureOf(relPath: string): string | null {
  const m = relPath.match(/^src\/features\/([^/]+)\//);
  return m ? m[1]! : null;
}

function classifyDoor(resolvedRel: string): DoorKind {
  if (
    /\/(presentation|hooks)\//.test(resolvedRel) ||
    /\/ui\.ts$/.test(resolvedRel) ||
    /\.tsx$/.test(resolvedRel) ||
    // Client API / browser session modules pull @asol/data-core/browser and
    // @/core/api. Putting them on the application door makes `import type` from
    // that door poison every service mirror that walks `export *`.
    /\/services\/[^/]+-api-service(\.ts)?$/.test(resolvedRel) ||
    /\/services\/session-service(\.ts)?$/.test(resolvedRel) ||
    /auth-lifecycle-events/.test(resolvedRel) ||
    /\/cart-store(\.ts)?$/.test(resolvedRel) ||
    /\/use-cart(\.ts)?$/.test(resolvedRel) ||
    /\/services\/profile-service(\.ts)?$/.test(resolvedRel)
  ) {
    return 'ui';
  }
  if (
    /\/server\.ts$/.test(resolvedRel) ||
    /\/server\//.test(resolvedRel) ||
    /\.server\.ts$/.test(resolvedRel) ||
    /\/infrastructure\//.test(resolvedRel) ||
    (/\/services\//.test(resolvedRel) && /\.server\./.test(resolvedRel)) ||
    (/\/application\//.test(resolvedRel) && /\.server\./.test(resolvedRel)) ||
    // Composition port modules that import `@asol/*/server` or `server-only`.
    /notifications-core-ports/.test(resolvedRel) ||
    (/-core-ports\.ts$/.test(resolvedRel) && /server/.test(resolvedRel))
  ) {
    return 'server';
  }
  // Port registrars that import package `/server` doors must never land on `.`.
  try {
    const candidate = resolvedRel.endsWith('.ts') || resolvedRel.endsWith('.tsx')
      ? resolvedRel
      : `${resolvedRel}.ts`;
    const abs = join(ROOT, candidate);
    if (existsSync(abs)) {
      const body = readFileSync(abs, 'utf8');
      if (
        /from\s+['"]server-only['"]/.test(body) ||
        /from\s+['"]@asol\/[^'"]+\/server['"]/.test(body)
      ) {
        return 'server';
      }
    }
  } catch {
    // ignore unreadable candidates
  }
  return 'index';
}

function isDoorSpecifier(spec: string, feature: string): boolean {
  return (
    spec === `@/features/${feature}` ||
    spec === `@/features/${feature}/ui` ||
    spec === `@/features/${feature}/server` ||
    spec === `@/features/${feature}/index`
  );
}

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"\n]+?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

const files = [
  ...walk(join(ROOT, 'src')),
  ...walk(join(ROOT, 'packages')).filter((f) => f.includes('-composition')),
  ...walk(join(ROOT, 'scripts')),
];

const cross: CrossImport[] = [];

for (const file of files) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (rel.includes('/tests/') && rel.includes('architecture')) continue;
  const text = readFileSync(file, 'utf8');
  const importerFeature = featureOf(rel);
  for (const match of text.matchAll(IMPORT_RE)) {
    const spec = match[1] ?? match[2];
    if (!spec) continue;
    const m = spec.match(/^@\/features\/([^/]+)(\/.*)?$/);
    if (!m) continue;
    const targetFeature = m[1]!;
    const rest = m[2] ?? '';
    if (importerFeature === targetFeature) continue;
    if (isDoorSpecifier(spec, targetFeature)) continue;
    // Already a door-ish path
    if (rest === '' || rest === '/ui' || rest === '/server' || rest === '/index') continue;

    const resolvedRel = `src/features/${targetFeature}${rest}`.replace(/\.(ts|tsx)$/, '');
    // Normalize: specifier may omit extension
    let resolvedFile = `src/features/${targetFeature}${rest}`;
    if (!resolvedFile.endsWith('.ts') && !resolvedFile.endsWith('.tsx')) {
      if (existsSync(join(ROOT, `${resolvedFile}.ts`))) resolvedFile = `${resolvedFile}.ts`;
      else if (existsSync(join(ROOT, `${resolvedFile}.tsx`))) resolvedFile = `${resolvedFile}.tsx`;
      else if (existsSync(join(ROOT, resolvedFile, 'index.ts')))
        resolvedFile = join(resolvedFile, 'index.ts').replace(/\\/g, '/');
      else if (existsSync(join(ROOT, resolvedFile, 'index.tsx')))
        resolvedFile = join(resolvedFile, 'index.tsx').replace(/\\/g, '/');
    }

    cross.push({
      importer: rel,
      importerFeature,
      targetFeature,
      specifier: spec,
      resolvedRel: resolvedFile,
      door: classifyDoor(resolvedFile),
    });
  }
}

console.log(`Cross-feature deep imports: ${cross.length}`);

/** Map feature → door → Set of module paths to re-export (without extension, relative to feature root) */
const doorExports = new Map<string, Map<DoorKind, Set<string>>>();

function addExport(feature: string, door: DoorKind, resolvedFile: string) {
  let byDoor = doorExports.get(feature);
  if (!byDoor) {
    byDoor = new Map();
    doorExports.set(feature, byDoor);
  }
  let set = byDoor.get(door);
  if (!set) {
    set = new Set();
    byDoor.set(door, set);
  }
  // Path relative to feature root, no extension, for `export * from "./…"`
  const prefix = `src/features/${feature}/`;
  let relPath = resolvedFile.startsWith(prefix)
    ? resolvedFile.slice(prefix.length)
    : resolvedFile;
  relPath = relPath.replace(/\.(ts|tsx)$/, '');
  if (relPath.endsWith('/index')) relPath = relPath.slice(0, -'/index'.length);
  // Don't re-export the door files themselves
  if (relPath === 'index' || relPath === 'ui' || relPath === 'server') return;
  set.add(relPath);
}

for (const c of cross) {
  addExport(c.targetFeature, c.door, c.resolvedRel);
}

const DOOR_FILE: Record<DoorKind, string> = {
  index: 'index.ts',
  ui: 'ui.ts',
  server: 'server.ts',
};

function ensureDoor(feature: string, door: DoorKind, modules: Set<string>) {
  const filePath = join(FEATURES, feature, DOOR_FILE[door]);
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';

  // Notifications already has carefully designed doors — only append missing re-exports
  // behind a generated block if needed. Prefer not to destroy hand-written API.
  const markerStart = '/* BEGIN GENERATED FEATURE DOOR EXPORTS */';
  const markerEnd = '/* END GENERATED FEATURE DOOR EXPORTS */';

  const lines = [`${markerStart}`, `/** Auto-maintained sealed-door re-exports. Do not edit by hand. */`];
  const sorted = [...modules].sort();
  for (const mod of sorted) {
    // Prefer export * — preserves types and values
    lines.push(`export * from './${mod}';`);
  }
  lines.push(markerEnd);
  const block = lines.join('\n');

  let next: string;
  if (existing.includes(markerStart) && existing.includes(markerEnd)) {
    next = existing.replace(
      new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`),
      block,
    );
  } else if (existing.trim().length === 0) {
    next =
      `/**\n` +
      ` * Public ${door === 'index' ? 'application' : door} door for \`@/features/${feature}${door === 'index' ? '' : '/' + door}\`.\n` +
      ` * Cross-feature consumers MUST import through this file only.\n` +
      ` */\n` +
      block +
      '\n';
  } else {
    next = existing.trimEnd() + '\n\n' + block + '\n';
  }

  // Avoid circular re-export: if a module path is the door itself, skip (already filtered)
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, next);
}

for (const [feature, byDoor] of doorExports) {
  for (const [door, mods] of byDoor) {
    if (mods.size === 0) continue;
    ensureDoor(feature, door, mods);
    console.log(`Door ${feature}/${DOOR_FILE[door]}: ${mods.size} modules`);
  }
}

// Ensure every feature has at least an index.ts (even if empty of generated exports)
for (const f of readdirSync(FEATURES, { withFileTypes: true })) {
  if (!f.isDirectory()) continue;
  const indexPath = join(FEATURES, f.name, 'index.ts');
  if (!existsSync(indexPath)) {
    writeFileSync(
      indexPath,
      `/**\n * Public application door for \`@/features/${f.name}\`.\n` +
        ` * Cross-feature consumers MUST import through declared doors only.\n */\n` +
        `export {};\n`,
    );
    console.log(`Created empty door ${f.name}/index.ts`);
  }
}

// Rewrite deep imports to doors
let rewriteCount = 0;
const byImporter = new Map<string, CrossImport[]>();
for (const c of cross) {
  const list = byImporter.get(c.importer) ?? [];
  list.push(c);
  byImporter.set(c.importer, list);
}

for (const [importer, imports] of byImporter) {
  const abs = join(ROOT, importer);
  if (!existsSync(abs)) continue;
  let text = readFileSync(abs, 'utf8');
  let next = text;
  // Longer specifiers first
  const sorted = [...imports].sort((a, b) => b.specifier.length - a.specifier.length);
  for (const c of sorted) {
    const doorSpec =
      c.door === 'index'
        ? `@/features/${c.targetFeature}`
        : `@/features/${c.targetFeature}/${c.door}`;
    // Replace quoted specifier
    next = next.split(`'${c.specifier}'`).join(`'${doorSpec}'`);
    next = next.split(`"${c.specifier}"`).join(`"${doorSpec}"`);
  }
  if (next !== text) {
    writeFileSync(abs, next);
    rewriteCount += 1;
  }
}

console.log(`Rewrote deep imports in ${rewriteCount} files`);

// Write analysis artifact for registry generation
const analysisPath = join(ROOT, 'packages/architecture-core/src/registry/.feature-import-analysis.json');
const summary = {
  crossCount: cross.length,
  byFeature: Object.fromEntries(
    [...doorExports.entries()].map(([f, doors]) => [
      f,
      Object.fromEntries([...doors.entries()].map(([d, s]) => [d, [...s].sort()])),
    ]),
  ),
};
writeFileSync(analysisPath, JSON.stringify(summary, null, 2));
console.log(`Wrote ${analysisPath}`);
