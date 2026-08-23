/**
 * Generate architecture reference Markdown from canonical registries.
 * Machine-readable sources: CAPABILITY_PACKAGES + APPLICATION_FEATURES + live package.json exports
 * and production @asol/* import edges.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { dirname, join } from 'path';

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
  const short = folder.replace(/-core$/, '-core').replace(/-composition$/, '');
  // Convention: test:<folder> or test:<name without @asol/>
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
  void short;
  return '`npm run architecture:check`';
}

function walkTs(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'tests' || e.name === 'dist') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walkTs(full, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

/** Production @asol/* import edges between packages. */
function collectPackageEdges(): Map<string, Set<string>> {
  const edges = new Map<string, Set<string>>();
  for (const pkg of CAPABILITY_PACKAGES) {
    edges.set(pkg.name, new Set());
    const src = join(ROOT, 'packages', pkg.folder, 'src');
    for (const file of walkTs(src)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/from\s+['"](@asol\/[^'"]+)['"]/g)) {
        const spec = match[1]!;
        const base = spec.split('/').slice(0, 2).join('/'); // @asol/name
        if (base === pkg.name) continue;
        // Keep full door when not just the package root
        edges.get(pkg.name)!.add(spec);
      }
      // Special: architecture-core may import @asol/ota-core/publishing
      for (const match of text.matchAll(/from\s+['"](@asol\/[^'"]+)['"]/g)) {
        void match;
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
      `| **Allowed Consumers** | Application via declared doors; composition packages wire ports |`,
    );
    lines.push(
      `| **Composition Root** | ${pkg.mayImportApp ? '`src/core/composition/` + feature ports' : '`N/A` (capability must not import `@/`)'} |`,
    );
    lines.push(
      `| **Infrastructure Owner** | ${pkg.vendorModules.length ? pkg.vendorModules.map((v) => `\`${v}\``).join(', ') : 'none (pure logic or ports)'} |`,
    );
    lines.push(`| **Status** | CLOSED (sealed package with registry entry) |`);
    lines.push(
      `| **Canonical Documents** | [package-catalog.md](./package-catalog.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |`,
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
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
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
      `| **Canonical Documentation** | [capability-map.md](./capability-map.md) · [module-isolation-rules.md](../02-packages/module-isolation-rules.md) |`,
    );
    lines.push('');
  }

  lines.push('## Counts');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---|`);
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
    'Explicit dependency relationships between sealed packages, derived from production imports under `packages/*/src`.',
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
    'MUST NOT form → circular @asol/* dependency (including import type)',
    '```',
    '',
    '## Package Import Graph (production source)',
    '',
  ];

  for (const pkg of [...CAPABILITY_PACKAGES].sort((a, b) => a.name.localeCompare(b.name))) {
    const deps = [...(edges.get(pkg.name) ?? [])].sort();
    lines.push(`### ${pkg.name}`);
    lines.push('');
    if (deps.length === 0) {
      lines.push(`\`${pkg.name}\` has no production \`@asol/*\` imports.`);
      lines.push('');
      continue;
    }
    for (const dep of deps) {
      lines.push(`\`${pkg.name}\``);
      lines.push(`ALLOWED_TO_IMPORT → \`${dep}\``);
      lines.push('');
    }
  }

  let edgeCount = 0;
  for (const set of edges.values()) edgeCount += set.size;
  lines.push('## Counts');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Packages | ${CAPABILITY_PACKAGES.length} |`);
  lines.push(`| Import edges | ${edgeCount} |`);
  lines.push('');

  return lines.join('\n');
}

export function renderApplicationFeatureCatalog(): string {
  const lines: string[] = [
    GENERATED_BANNER,
    '# Application Feature Catalog',
    '',
    '## Purpose',
    '',
    'Canonical inventory of every application feature under `src/features/`.',
    '',
    '## Scope',
    '',
    `All ${APPLICATION_FEATURES.length} registered features. Sealed packages are listed in [package-catalog.md](./package-catalog.md).`,
    '',
    '## Source of Truth',
    '',
    '**Canonical source:** `packages/architecture-core/src/registry/application-features-registry.ts` (`APPLICATION_FEATURES`).',
    'This Markdown file is **generated** and verified by `architecture:check`.',
    '',
    '## Approved application roots',
    '',
    '```text',
    'src/',
    '  app/        # Next.js routes (framework-required)',
    '  core/       # API client, config, composition roots, providers',
    '  features/   # Application features (registered, default-deny)',
    '  shared/     # Cross-feature, domain-neutral application code only',
    '```',
    '',
    '`src/modules/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/theme/`, and `src/locales/` are forbidden competing roots.',
    '',
    '---',
    '',
  ];

  for (const feature of APPLICATION_FEATURES) {
    lines.push(`### ${feature.name}`);
    lines.push('');
    lines.push('| Field | Value |');
    lines.push('|---|---|');
    lines.push(`| **Feature** | \`${feature.name}\` |`);
    lines.push(`| **Source** | \`${feature.sourcePath}/\` |`);
    lines.push(`| **Owns** | ${feature.owns} |`);
    lines.push(
      `| **Public Doors** | ${feature.doors.map((d) => (d === '.' ? `\`@/features/${feature.name}\`` : `\`@/features/${feature.name}/${d.slice(2)}\``)).join(' · ') || '_(none)_'} |`,
    );
    lines.push(
      `| **Runtime Targets** | ${feature.runtimeTargets.map((t) => `\`${t}\``).join(', ')} |`,
    );
    lines.push(
      `| **Capability Owners** | ${feature.capabilityOwners.length ? feature.capabilityOwners.map((c) => `\`${c}\``).join(', ') : '_(none)_'} |`,
    );
    lines.push(
      `| **Permitted Feature Dependencies** | ${feature.permittedDependencies.length ? feature.permittedDependencies.map((d) => `\`${d}\``).join(', ') : '_(none)_'} |`,
    );
    lines.push(
      `| **Deep Import Seams** | ${feature.deepImportSeams.length ? feature.deepImportSeams.map((d) => `\`${d}\``).join(', ') : '_(none)_'} |`,
    );
    lines.push(
      `| **Surfaces** | browser=${feature.hasBrowser} · server=${feature.hasServer} · ui=${feature.hasUi} |`,
    );
    lines.push('');
  }

  lines.push('## Counts');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Application features | ${APPLICATION_FEATURES.length} |`);
  lines.push(
    `| Features with UI door | ${APPLICATION_FEATURES.filter((f) => f.doors.includes('./ui')).length} |`,
  );
  lines.push(
    `| Features with server door | ${APPLICATION_FEATURES.filter((f) => f.doors.includes('./server')).length} |`,
  );
  lines.push(
    `| Sealed capability packages | ${CAPABILITY_PACKAGES.length} |`,
  );
  lines.push('');

  return lines.join('\n');
}

export type ArchitectureDocId = (typeof GENERATED_ARCHITECTURE_DOCS)[number];

export function renderArchitectureDoc(id: ArchitectureDocId): string {
  switch (id) {
    case 'docs/01-architecture/08-reference/capability-map.md':
      return renderCapabilityMap();
    case 'docs/01-architecture/08-reference/package-catalog.md':
      return renderPackageCatalog();
    case 'docs/01-architecture/08-reference/dependency-map.md':
      return renderDependencyMap();
    case 'docs/01-architecture/08-reference/application-feature-catalog.md':
      return renderApplicationFeatureCatalog();
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function writeArchitectureDocs(): void {
  for (const id of GENERATED_ARCHITECTURE_DOCS) {
    const abs = join(ROOT, id);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, renderArchitectureDoc(id));
  }
}

export function diffArchitectureDocs(): Array<{ path: string; reason: string }> {
  const diffs: Array<{ path: string; reason: string }> = [];
  for (const id of GENERATED_ARCHITECTURE_DOCS) {
    const abs = join(ROOT, id);
    const expected = renderArchitectureDoc(id);
    if (!existsSync(abs)) {
      diffs.push({ path: id, reason: 'missing generated documentation file' });
      continue;
    }
    const actual = readFileSync(abs, 'utf8');
    if (actual !== expected) {
      diffs.push({
        path: id,
        reason: 'content differs from canonical architecture model output',
      });
    }
  }
  void statSync;
  return diffs;
}
