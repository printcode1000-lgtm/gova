/**
 * Generate architecture reference Markdown from canonical registries.
 * Machine-readable sources: CAPABILITY_PACKAGES + APPLICATION_FEATURES + live package.json exports
 * and production @asol/* import edges.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { extractImports } from '../checks/architecture-types';
import { CAPABILITY_PACKAGES } from '../registry/capability-registry';
import { APPLICATION_FEATURES } from '../registry/application-features-registry';

const ROOT = process.cwd();

export const GENERATED_ARCHITECTURE_DOCS = [
  'docs/01-architecture/08-reference/capability-map.md',
  'docs/01-architecture/08-reference/package-catalog.md',
  'docs/01-architecture/08-reference/dependency-map.md',
  'docs/01-architecture/08-reference/application-feature-catalog.md',
] as const;

const GENERATED_BANNER = `<!-- GENERATED FILE. DO NOT EDIT BY HAND.
     Source: packages/architecture-core registries (CAPABILITY_PACKAGES, APPLICATION_FEATURES).
     Regenerate: npm run architecture:docs
     Drift fails: npm run architecture:check -->
`;

function packageExports(folder: string): string[] {
  const manifestPath = join(ROOT, 'packages', folder, 'package.json');
  if (!existsSync(manifestPath)) return [];
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    exports?: Record<string, unknown>;
  };
  return Object.keys(manifest.exports ?? {}).sort((a, b) => {
    if (a === '.') return -1;
    if (b === '.') return 1;
    return a.localeCompare(b);
  });
}

function testGate(folder: string, name: string): string {
  const candidates = [
    `test:${folder}`,
    `test:${name.replace('@asol/', '')}`,
  ];
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    for (const c of candidates) {
      if (pkg.scripts?.[c]) return `\`npm run ${c}\``;
    }
    if (folder.endsWith('-composition')) return '`npm run test:compositions`';
  } catch {
    /* ignore */
  }
  return '`npm run architecture:check`';
}

function walkTs(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'tests' || e.name === '__tests__' || e.name === 'dist') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walkTs(full, out);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(e.name) && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(e.name)) out.push(full);
  }
  return out;
}

/** Production @asol/* import edges between packages, parsed by the same helper as enforcement. */
function collectPackageEdges(): Map<string, Set<string>> {
  const edges = new Map<string, Set<string>>();
  for (const pkg of CAPABILITY_PACKAGES) {
    const owned = new Set<string>();
    edges.set(pkg.name, owned);
    const src = join(ROOT, 'packages', pkg.folder, 'src');
    for (const file of walkTs(src)) {
      const text = readFileSync(file, 'utf8');
      for (const spec of extractImports(text)) {
        if (!spec.startsWith('@asol/')) continue;
        const base = spec.split('/').slice(0, 2).join('/');
        if (base === pkg.name) continue;
        owned.add(spec);
      }
    }
  }
  return edges;
}

export function renderCapabilityMap(): string {
  const lines: string[] = [
    GENERATED_BANNER,
    '# Capability Map',
    '',
    '## Purpose',
    '',
    'Machine-readable capability ownership reference. Each capability has exactly one authoritative owner package. Agents MUST consult this map before modifying or introducing capabilities.',
    '',
    '## Scope',
    '',
    `All ${CAPABILITY_PACKAGES.length} sealed \`@asol/*\` packages. Application-layer orchestration lives under \`src/features/*\` — see [application-feature-catalog.md](./application-feature-catalog.md).`,
    '',
    '## Source of Truth',
    '',
    '**Canonical source:** `packages/architecture-core/src/registry/capability-registry.ts` (`CAPABILITY_PACKAGES`).',
    'This Markdown file is **generated** and verified by `architecture:check`. Do not edit it by hand.',
    '',
    '---',
    '',
  ];

  for (const pkg of CAPABILITY_PACKAGES) {
    const doors = packageExports(pkg.folder);
    lines.push(`## ${pkg.owns}`);
    lines.push('');
    lines.push('| Field | Value |');
    lines.push('|---|---|');
    lines.push(`| **Capability** | ${pkg.owns} |`);
    lines.push(`| **Owner Package** | \`${pkg.name}\` |`);
    lines.push(`| **Architectural Layer** | ${pkg.layer} |`);
    lines.push(
      `| **Public Gateway** | ${doors.map((d) => (d === '.' ? pkg.name : `${pkg.name}/${d.slice(2)}`)).map((s) => `\`${s}\``).join(' · ') || '_(none)_'} |`,
    );
    lines.push(
      '| **Allowed Consumers** | Application via declared doors; composition packages wire ports |',
    );
    lines.push(
      `| **Composition Root** | ${pkg.mayImportApp ? '`src/core/composition/` + feature ports' : '`N/A` (capability must not import `@/`)'} |`,
    );
    lines.push(
      `| **Infrastructure Owner** | ${pkg.vendorModules.length ? pkg.vendorModules.map((v) => `\`${v}\``).join(', ') : 'none (pure logic or ports)'} |`,
    );
    lines.push('| **Status** | CLOSED (sealed package with registry entry) |');
    lines.push(
      '| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |',
    );
    lines.push('');
    lines.push(
      `**Source Map:** \`packages/${pkg.folder}/\` · registry: \`packages/architecture-core/src/registry/capability-registry.ts\``,
    );
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push('## Counts');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Sealed packages | ${CAPABILITY_PACKAGES.length} |`);
  const byLayer = new Map<string, number>();
  for (const p of CAPABILITY_PACKAGES) byLayer.set(p.layer, (byLayer.get(p.layer) ?? 0) + 1);
  for (const [layer, count] of [...byLayer.entries()].sort()) {
    lines.push(`| Layer \`${layer}\` | ${count} |`);
  }
  lines.push('');

  return lines.join('\n');
}

export function renderPackageCatalog(): string {
  const lines: string[] = [
    GENERATED_BANNER,
    '# Package Catalog',
    '',
    '## Purpose',
    '',
    'Canonical inventory of every sealed `@asol/*` package in `packages/`.',
    '',
    '## Scope',
    '',
    `Covers all ${CAPABILITY_PACKAGES.length} sealed packages under \`packages/\`. Does not cover \`services/*/generated/\` mirrors.`,
    '',
    '## Source of Truth',
    '',
    '**Canonical source:** `packages/architecture-core/src/registry/capability-registry.ts` + each `packages/<folder>/package.json` `exports`.',
    'This Markdown file is **generated** and verified by `architecture:check`.',
    '',
    '---',
    '',
  ];

  for (const pkg of CAPABILITY_PACKAGES) {
    const doors = packageExports(pkg.folder);
    lines.push(`### ${pkg.name}`);
    lines.push('');
    lines.push('| Field | Value |');
    lines.push('|---|---|');
    lines.push(`| **Package** | \`${pkg.name}\` |`);
    lines.push(`| **Folder** | \`packages/${pkg.folder}/\` |`);
    lines.push(`| **Purpose** | ${pkg.owns} |`);
    lines.push(`| **Architectural Layer** | ${pkg.layer} |`);
    lines.push(
      `| **Public Exports** | ${doors.map((d) => `\`${d}\``).join(' · ') || '_(none)_'} |`,
    );
    lines.push(
      `| **Infrastructure Privileges** | ${pkg.vendorModules.length ? pkg.vendorModules.map((v) => `\`${v}\``).join(', ') : 'none'} |`,
    );
    lines.push(`| **May Import App (\`@/\`)** | ${pkg.mayImportApp ? 'yes' : 'no'} |`);
    lines.push(`| **Test Gate** | ${testGate(pkg.folder, pkg.name)} |`);
    lines.push(
      '| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |',
    );
    lines.push('');
  }

  lines.push('## Counts');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Packages | ${CAPABILITY_PACKAGES.length} |`);
  lines.push('');

  return lines.join('\n');
}

export function renderDependencyMap(): string {
  const edges = collectPackageEdges();
  const lines: string[] = [
    GENERATED_BANNER,
    '# Dependency Map',
    '',
    '## Purpose',
    '',
    'Explicit dependency relationships between sealed packages, derived from production imports under `packages/*/src` using the same import parser as architecture enforcement.',
    '',
    '## Scope',
    '',
    'Package-to-package `@asol/*` import edges. Application feature dependencies: [application-feature-catalog.md](./application-feature-catalog.md).',
    '',
    '## Source of Truth',
    '',
    '**Canonical sources:** live production imports under `packages/*/src` + `CAPABILITY_PACKAGES` for package identity.',
    'This Markdown file is **generated** and verified by `architecture:check`.',
    '',
    '---',
    '',
    '## Global Rules',
    '',
    '```text',
    'capability packages',
    'MUST NOT_IMPORT → @/ (application paths)',
    '',
    'capability packages',
    'MUST NOT_IMPORT → undeclared @asol/* subpaths',
    '',
    'capability packages',
    'MUST NOT_IMPORT → vendor SDKs not registered in vendorModules',
    '',
    'composition packages',
    'MAY_IMPORT → @/ (only layer with mayImportApp: true)',
    '',
    'all packages',
    'MUST NOT_FORM → package dependency cycles',
    '```',
    '',
    '---',
    '',
    '## Package Edges',
    '',
  ];

  for (const pkg of CAPABILITY_PACKAGES) {
    const deps = [...(edges.get(pkg.name) ?? [])].sort();
    lines.push(`### \`${pkg.name}\``);
    lines.push('');
    lines.push(deps.length ? deps.map((d) => `- → \`${d}\``).join('\n') : '- _(no @asol package dependencies)_');
    lines.push('');
  }

  return lines.join('\n');
}

export function renderApplicationFeatureCatalog(): string {
  const lines: string[] = [
    GENERATED_BANNER,
    '# Application Feature Catalog',
    '',
    '## Purpose',
    '',
    'Canonical application-layer feature inventory. Every direct child of `src/features/` must appear here exactly once.',
    '',
    '## Source of Truth',
    '',
    '**Canonical source:** `packages/architecture-core/src/registry/application-features-registry.ts` (`APPLICATION_FEATURES`).',
    'This Markdown file is **generated** and verified by `architecture:check`.',
    '',
    `Registered features: **${APPLICATION_FEATURES.length}**.`,
    '',
    '| Feature | Purpose | Doors | Runtime | Capability owners | Dependencies | Deep-import seam targets |',
    '|---|---|---|---|---|---|---|',
  ];

  for (const feature of APPLICATION_FEATURES) {
    lines.push(
      `| \`${feature.name}\` | ${feature.purpose.replace(/\|/g, '\\|')} | ${feature.doors.map((d) => `\`${d}\``).join(', ') || '—'} | ${feature.runtimeTargets.map((r) => `\`${r}\``).join(', ')} | ${feature.capabilityOwners.map((p) => `\`${p}\``).join(', ') || '—'} | ${feature.permittedDependencies.map((d) => `\`${d}\``).join(', ') || '—'} | ${feature.deepImportSeams.map((d) => `\`${d}\``).join(', ') || '—'} |`,
    );
  }

  lines.push('');
  lines.push('## Structural Rules');
  lines.push('');
  lines.push('- `src/modules/` is forbidden and cannot be recreated.');
  lines.push('- Approved directory roots under `src/`: `app/`, `core/`, `features/`, `shared/`.');
  lines.push('- Cross-feature consumers use declared doors (`.`, `/ui`, `/server`).');
  lines.push('- Feature-to-feature deep paths require both a declared seam target and an exact `FEATURE_DEEP_IMPORT_SEAMS` path; target names alone grant no authority.');
  lines.push('- Isolated composition packages may use only exact `COMPOSITION_FEATURE_SEAMS` when a public barrel would widen their service mirror graph.');
  lines.push('- Feature-internal directories use the canonical vocabulary from `FEATURE_INTERNAL_VOCABULARY`.');
  lines.push('- `src/shared/` is only for genuinely cross-feature, domain-neutral code.');
  lines.push('');
  lines.push('See [feature-seams.md](./feature-seams.md) for the generated exact seam inventory.');
  lines.push('');

  return lines.join('\n');
}

export type ArchitectureDocId = (typeof GENERATED_ARCHITECTURE_DOCS)[number];

export function renderArchitectureDoc(id: ArchitectureDocId): string {
  switch (id) {
    case GENERATED_ARCHITECTURE_DOCS[0]: return renderCapabilityMap();
    case GENERATED_ARCHITECTURE_DOCS[1]: return renderPackageCatalog();
    case GENERATED_ARCHITECTURE_DOCS[2]: return renderDependencyMap();
    case GENERATED_ARCHITECTURE_DOCS[3]: return renderApplicationFeatureCatalog();
  }
}

export function writeArchitectureDocs(): void {
  for (const id of GENERATED_ARCHITECTURE_DOCS) {
    const target = join(ROOT, id);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, renderArchitectureDoc(id), 'utf8');
  }
}

export interface ArchitectureDocDiff {
  path: ArchitectureDocId;
  reason: 'missing' | 'content differs from canonical model';
}

export function diffArchitectureDocs(): ArchitectureDocDiff[] {
  const diffs: ArchitectureDocDiff[] = [];
  for (const id of GENERATED_ARCHITECTURE_DOCS) {
    const target = join(ROOT, id);
    if (!existsSync(target)) {
      diffs.push({ path: id, reason: 'missing' });
      continue;
    }
    const actual = readFileSync(target, 'utf8');
    const expected = renderArchitectureDoc(id);
    if (actual !== expected) diffs.push({ path: id, reason: 'content differs from canonical model' });
  }
  return diffs;
}
