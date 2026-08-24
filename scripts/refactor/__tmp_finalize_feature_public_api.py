from pathlib import Path
import re

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding='utf-8')


# 1) APPLICATION_FEATURES: public doors are the only feature-to-feature authority.
registry_path = 'packages/architecture-core/src/registry/application-features-registry.ts'
s = read(registry_path)
s, interface_count = re.subn(
    r"\n  /\*\*\n   \* Justified deep-import seams[\s\S]*?\n  deepImportSeams: readonly string\[\];",
    '',
    s,
    count=1,
)
if interface_count != 1:
    raise SystemExit(f'expected one deepImportSeams interface block, found {interface_count}')
s, property_count = re.subn(r'^\s{4}deepImportSeams:.*\n', '', s, flags=re.M)
if property_count < 1:
    raise SystemExit('no deepImportSeams properties were removed')

# Notifications no longer imports auth/orders/specialty-chat; runtime composition binds ports/extensions.
start = s.index("    name: 'notifications',")
end = s.index('\n  },', start)
block = s[start:end]
block, dep_count = re.subn(
    r"    permittedDependencies: \[[\s\S]*?\],\n",
    "    permittedDependencies: [],\n",
    block,
    count=1,
)
if dep_count != 1:
    raise SystemExit('failed to normalize notifications permittedDependencies')
s = s[:start] + block + s[end:]
if 'deepImportSeams' in s:
    raise SystemExit('deepImportSeams remains in application feature registry')
write(registry_path, s)


# 2) Feature dependency graph: only permittedDependencies grants an inter-feature edge.
write(
    'packages/architecture-core/src/checks/feature-dependency-contract.ts',
    '''/**
 * Feature dependency graph contract.
 *
 * Builds the real cross-feature import graph from production sources under
 * `src/features/`, then proves:
 * - every edge is declared on `permittedDependencies`
 * - every declared dependency is used (no stale authority)
 * - every declared dependency names a registered feature
 *
 * Door legality is enforced separately by `feature-door-contract`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

import { APPLICATION_FEATURES } from '../registry/application-features-registry';
import { ROOT, addViolation, extractImports, rel } from './architecture-types';

const FEATURES_ROOT = join(ROOT, 'src', 'features');

function featureSourceFiles(featureName: string): string[] {
  const root = join(FEATURES_ROOT, featureName);
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'tests' || entry === '__tests__' || entry === 'node_modules') continue;
        walk(full);
        continue;
      }
      if (!/\\.(ts|tsx)$/.test(entry) || /\\.test\\.(ts|tsx)$/.test(entry)) continue;
      if (entry.includes('__architecture_attack') || entry.includes('__attack_')) continue;
      found.push(full);
    }
  };
  walk(root);
  return found;
}

function featureOfRepoPath(repoPath: string): string | null {
  const normalized = repoPath.replace(/\\\\/g, '/');
  const match = normalized.match(/^src\\/features\\/([^/]+)(?:\\/|$)/);
  return match?.[1] ?? null;
}

function targetFeatureOfSpecifier(specifier: string, importerFile: string): string | null {
  const alias = specifier.match(/^@\\/features\\/([^/]+)(?:\\/|$)/);
  if (alias) return alias[1]!;
  if (!specifier.startsWith('.')) return null;
  const resolved = relative(ROOT, resolve(dirname(importerFile), specifier)).replace(/\\\\/g, '/');
  return featureOfRepoPath(resolved);
}

function buildActualGraph(): Map<string, Map<string, string>> {
  const registered = new Set(APPLICATION_FEATURES.map((f) => f.name));
  const graph = new Map<string, Map<string, string>>();
  for (const feature of APPLICATION_FEATURES) {
    const edges = new Map<string, string>();
    for (const file of featureSourceFiles(feature.name)) {
      const content = readFileSync(file, 'utf8');
      for (const specifier of extractImports(content)) {
        const target = targetFeatureOfSpecifier(specifier, file);
        if (!target || target === feature.name || !registered.has(target)) continue;
        if (!edges.has(target)) edges.set(target, rel(file));
      }
    }
    graph.set(feature.name, edges);
  }
  return graph;
}

export function checkFeatureDependencyContract(): void {
  const actual = buildActualGraph();
  const byName = new Map(APPLICATION_FEATURES.map((f) => [f.name, f]));
  for (const feature of APPLICATION_FEATURES) {
    const edges = actual.get(feature.name) ?? new Map();
    const allowed = new Set(feature.permittedDependencies);

    for (const [target, exampleFile] of edges) {
      if (allowed.has(target)) continue;
      addViolation(
        'Feature Dependencies',
        join(ROOT, exampleFile),
        `Feature "${feature.name}" imports "${target}" but permittedDependencies does not declare it.`,
        `Add "${target}" to permittedDependencies for "${feature.name}" and import only through its declared public door.`,
      );
    }

    for (const dep of feature.permittedDependencies) {
      if (!byName.has(dep)) {
        addViolation(
          'Feature Dependencies',
          join(ROOT, feature.sourcePath),
          `Feature "${feature.name}" lists unknown permitted dependency "${dep}".`,
          'Remove the stale name or register the target feature.',
        );
        continue;
      }
      if (!edges.has(dep)) {
        addViolation(
          'Feature Dependencies',
          join(ROOT, feature.sourcePath),
          `Feature "${feature.name}" declares permitted dependency "${dep}" but no production import uses it.`,
          'Remove the stale permittedDependencies entry.',
        );
      }
    }
  }
}
''',
)


# 3) Feature door contract: feature-to-feature deep imports have zero exceptions.
write(
    'packages/architecture-core/src/checks/feature-door-contract.ts',
    '''/**
 * Sealed feature-door contract.
 *
 * Outside a feature, only declared doors (`@/features/<name>`, `/ui`, `/server`)
 * may be imported. Feature-to-feature deep imports have no exceptions.
 *
 * Isolated composition/service-mirror packages may use an exact
 * `COMPOSITION_FEATURE_SEAMS` entry when importing a public barrel would widen
 * the isolated deployment graph. Those seams are exact, default-deny, and
 * unavailable to ordinary application features.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

import {
  featureByName,
  isFeatureDoorSpecifier,
} from '../registry/application-features-registry';
import { CAPABILITY_PACKAGES } from '../registry/capability-registry';
import {
  COMPOSITION_FEATURE_SEAMS,
  isCompositionFeatureSeam,
} from '../registry/composition-feature-seams-registry';
import { ROOT, SRC, addViolation, extractImports, walk, rel } from './architecture-types';

const FEATURE_PREFIX = 'src/features/';
const PACKAGE_BY_FOLDER = new Map(CAPABILITY_PACKAGES.map((pkg) => [pkg.folder, pkg]));

function featureOfPath(repoRel: string): string | null {
  if (!repoRel.startsWith(FEATURE_PREFIX)) return null;
  const rest = repoRel.slice(FEATURE_PREFIX.length);
  return rest.split('/')[0] || null;
}

function compositionPackageOfPath(repoRel: string): string | null {
  const match = repoRel.match(/^packages\\/([^/]+)\\/src\\//);
  if (!match) return null;
  const folder = match[1]!;
  return PACKAGE_BY_FOLDER.get(folder)?.mayImportApp ? folder : null;
}

function resolveSpecifier(specifier: string, importerAbs: string): string | null {
  if (specifier.startsWith('@/')) return `src/${specifier.slice(2)}`;
  if (specifier.startsWith('.')) {
    const abs = resolve(dirname(importerAbs), specifier);
    return relative(ROOT, abs).replace(/\\\\/g, '/');
  }
  return null;
}

function normalizeModulePath(repoPath: string): string {
  return repoPath.replace(/\\.(?:ts|tsx)$/, '');
}

function sourcePathExists(repoPathWithoutExtension: string): boolean {
  const absolute = join(ROOT, repoPathWithoutExtension);
  return (
    existsSync(absolute) ||
    existsSync(`${absolute}.ts`) ||
    existsSync(`${absolute}.tsx`) ||
    existsSync(join(absolute, 'index.ts')) ||
    existsSync(join(absolute, 'index.tsx'))
  );
}

function validateCompositionFeatureSeamRegistry(): void {
  for (const [packageFolder, seams] of Object.entries(COMPOSITION_FEATURE_SEAMS)) {
    const pkg = PACKAGE_BY_FOLDER.get(packageFolder);
    if (!pkg || !pkg.mayImportApp) {
      addViolation(
        'Feature Doors',
        join(ROOT, 'packages', packageFolder),
        `COMPOSITION_FEATURE_SEAMS names "${packageFolder}", which is not a registered mayImportApp package.`,
        'Register only explicit composition/application-boundary packages.',
      );
    }

    const seen = new Set<string>();
    for (const specifier of seams) {
      if (seen.has(specifier)) {
        addViolation(
          'Feature Doors',
          join(ROOT, 'packages', packageFolder),
          `Duplicate composition feature seam "${specifier}".`,
          'Each exact seam must be registered once.',
        );
      }
      seen.add(specifier);
      const match = specifier.match(/^@\\/features\\/([^/]+)\\/(.+)$/);
      if (!match || ['ui', 'server', 'index'].includes(match[2]!)) {
        addViolation(
          'Feature Doors',
          join(ROOT, 'packages', packageFolder),
          `Composition seam "${specifier}" is not an exact deep feature path.`,
          'Declared feature doors do not belong in the seam registry; import them normally.',
        );
        continue;
      }
      const featureName = match[1]!;
      if (!featureByName(featureName)) {
        addViolation(
          'Feature Doors',
          join(ROOT, 'packages', packageFolder),
          `Composition seam "${specifier}" targets unregistered feature "${featureName}".`,
          'Use a registered APPLICATION_FEATURES owner.',
        );
      }
      const repoPath = `src/${specifier.slice(2)}`;
      if (!sourcePathExists(repoPath)) {
        addViolation(
          'Feature Doors',
          join(ROOT, 'packages', packageFolder),
          `Composition seam "${specifier}" points at a missing source module.`,
          'Remove the stale seam or restore the exact module.',
        );
      }
    }
  }
}

function productionCompositionSources(): string[] {
  const files: string[] = [];
  for (const pkg of CAPABILITY_PACKAGES) {
    if (!pkg.mayImportApp) continue;
    const src = join(ROOT, 'packages', pkg.folder, 'src');
    if (!existsSync(src)) continue;
    for (const file of walk(src)) {
      const repoRel = rel(file);
      if (
        repoRel.includes('/tests/') ||
        repoRel.includes('/__tests__/') ||
        /\\.(?:test|spec)\\.[cm]?[jt]sx?$/.test(repoRel)
      ) continue;
      files.push(file);
    }
  }
  return files;
}

export function checkFeatureDoorContract(): void {
  validateCompositionFeatureSeamRegistry();
  const scanned = [...walk(SRC), ...productionCompositionSources()];
  const usedCompositionSeams = new Map<string, Set<string>>();

  for (const file of scanned) {
    const repoRel = rel(file);
    const importerFeature = featureOfPath(repoRel);
    const compositionPackage = compositionPackageOfPath(repoRel);
    const imports = extractImports(readFileSync(file, 'utf8'));

    for (const specifier of imports) {
      const deepAlias = specifier.match(/^@\\/features\\/([^/]+)\\/(.+)$/);
      if (deepAlias) {
        const target = deepAlias[1]!;
        const rest = deepAlias[2]!;
        if (rest === 'ui' || rest === 'server') {
          validateDoorImport(repoRel, importerFeature, target, specifier);
          continue;
        }
        if (importerFeature === target) continue;
        if (compositionPackage && isCompositionFeatureSeam(compositionPackage, specifier)) {
          const used = usedCompositionSeams.get(compositionPackage) ?? new Set<string>();
          used.add(specifier);
          usedCompositionSeams.set(compositionPackage, used);
          continue;
        }
        addViolation(
          'Feature Doors',
          file,
          `Deep cross-feature import "${specifier}" bypasses declared doors.`,
          compositionPackage
            ? 'Register this exact path in COMPOSITION_FEATURE_SEAMS only if the service mirror requires a narrower graph; otherwise use a declared feature door.'
            : `Use @/features/${target}, @/features/${target}/ui, or @/features/${target}/server. Feature-to-feature deep imports have no exceptions.`,
        );
        continue;
      }

      const doorHit = isFeatureDoorSpecifier(specifier);
      if (doorHit) {
        validateDoorImport(repoRel, importerFeature, doorHit.feature, specifier);
        continue;
      }

      const resolvedRaw = resolveSpecifier(specifier, file);
      if (!resolvedRaw) continue;
      const resolved = normalizeModulePath(resolvedRaw);
      const targetFeature = featureOfPath(resolved);
      if (!targetFeature || importerFeature === targetFeature) continue;

      addViolation(
        'Feature Doors',
        file,
        `Import "${specifier}" resolves into feature "${targetFeature}" without using its declared public API.`,
        compositionPackage
          ? 'Composition seams must use an exact registered @/features/... alias; relative cross-feature traversal is never allowed.'
          : `Use a declared @/features/${targetFeature} public door. Relative cross-feature traversal has no authority.`,
      );
    }
  }

  for (const [packageFolder, seams] of Object.entries(COMPOSITION_FEATURE_SEAMS)) {
    const used = usedCompositionSeams.get(packageFolder) ?? new Set<string>();
    for (const specifier of seams) {
      if (used.has(specifier)) continue;
      addViolation(
        'Feature Doors',
        join(ROOT, 'packages', packageFolder),
        `Composition feature seam "${specifier}" is registered but unused.`,
        'Remove stale seam authority when the production import no longer exists.',
      );
    }
  }
}

function validateDoorImport(
  importerRel: string,
  importerFeature: string | null,
  targetFeature: string,
  specifier: string,
): void {
  const target = featureByName(targetFeature);
  if (!target) {
    addViolation(
      'Feature Doors',
      join(ROOT, importerRel),
      `Import "${specifier}" targets unregistered feature "${targetFeature}".`,
      'Register the feature in APPLICATION_FEATURES.',
    );
    return;
  }

  const doorMatch = specifier.match(/^@\\/features\\/([^/]+)(?:\\/(ui|server))?$/);
  if (specifier.startsWith('@/features/') && !doorMatch) {
    addViolation(
      'Feature Doors',
      join(ROOT, importerRel),
      `Import "${specifier}" is not a declared feature-door specifier.`,
      `Use one of the declared doors for @/features/${targetFeature}.`,
    );
    return;
  }

  if (doorMatch) {
    const door: import('../registry/application-features-registry').FeatureDoor =
      doorMatch[2] === 'ui' ? './ui' : doorMatch[2] === 'server' ? './server' : '.';
    if (!target.doors.includes(door)) {
      addViolation(
        'Feature Doors',
        join(ROOT, importerRel),
        `Import "${specifier}" uses undeclared door for feature "${targetFeature}".`,
        `Declared doors: ${target.doors.join(', ') || '(none)'}.`,
      );
    }
  }

  if (importerFeature && importerFeature !== targetFeature) {
    const importer = featureByName(importerFeature);
    if (importer && !importer.permittedDependencies.includes(targetFeature)) {
      addViolation(
        'Feature Doors',
        join(ROOT, importerRel),
        `Feature "${importerFeature}" imports "${targetFeature}" but that dependency is not declared.`,
        `Add "${targetFeature}" to permittedDependencies only if this edge is architecturally justified.`,
      );
    }
  }
}
''',
)


# 4) architecture-core public exports: remove the deleted feature seam registry.
index_path = 'packages/architecture-core/src/index.ts'
s = read(index_path)
s, export_count = re.subn(
    r"export \{\n  FEATURE_DEEP_IMPORT_SEAMS,\n  isFeatureDeepImportSeam,\n  type FeatureDeepImportSeamOwner,\n\} from './registry/feature-deep-import-seams-registry';\n",
    '',
    s,
    count=1,
)
if export_count != 1:
    raise SystemExit(f'expected one feature seam export block, found {export_count}')
write(index_path, s)


# 5) Generated application feature catalog: remove obsolete seam row.
docs_path = 'packages/architecture-core/src/docs/generate-architecture-docs.ts'
s = read(docs_path)
s, row_count = re.subn(
    r"\n    lines\.push\(\n      `\| \*\*Deep Import Seams\*\* \| \$\{feature\.deepImportSeams\.length \? feature\.deepImportSeams\.map\(\(d\) => `\\`\$\{d\}\\``\)\.join\(', '\) : '_\(none\)_'\} \|`,\n    \);",
    '',
    s,
    count=1,
)
if row_count != 1:
    # Keep the failure explicit; do not silently leave stale generated metadata logic.
    raise SystemExit(f'failed to remove Deep Import Seams generated row: {row_count}')
write(docs_path, s)


# 6) The remaining seam reference is composition-only.
write(
    'packages/architecture-core/src/docs/generate-feature-seams-doc.ts',
    '''/** Deterministic reference documentation for exact composition/service-mirror seams. */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { COMPOSITION_FEATURE_SEAMS } from '../registry/composition-feature-seams-registry';

const ROOT = process.cwd();
export const GENERATED_FEATURE_SEAMS_DOC =
  'docs/01-architecture/08-reference/feature-seams.md' as const;

function tableEscape(value: string): string {
  return value.replace(/\\|/g, '\\\\|');
}

export function renderFeatureSeamsDoc(): string {
  const rows = Object.entries(COMPOSITION_FEATURE_SEAMS).flatMap(([owner, seams]) =>
    seams.map((path) => `| \\`${tableEscape(owner)}\\` | \\`${tableEscape(path)}\\` |`),
  );

  return [
    '<!-- GENERATED FILE — DO NOT EDIT. Run `npm run architecture:docs`. -->',
    '',
    '# Composition Feature Seams',
    '',
    'Feature-to-feature dependencies have no deep-import exceptions: they must use declared public doors.',
    'The only exact application paths listed here belong to composition/service-mirror packages whose isolated import graphs must remain narrower than a broad feature barrel.',
    '',
    '## Source of Truth',
    '',
    '- `packages/architecture-core/src/registry/composition-feature-seams-registry.ts`',
    '',
    `Current inventory: **${rows.length}** exact composition seam path(s).`,
    '',
    '| Composition package | Exact application module |',
    '| --- | --- |',
    ...(rows.length > 0 ? rows : ['| — | — |']),
    '',
    '## Enforcement',
    '',
    '- Feature-to-feature deep imports always fail.',
    '- Relative traversal cannot bypass feature public doors or composition seams.',
    '- Composition seams must be exact, existing, registered, and actively used.',
    '- Stale, duplicate, missing, or broad composition seam authority fails `architecture:check`.',
    '',
  ].join('\\n');
}

export function writeFeatureSeamsDoc(): void {
  writeFileSync(join(ROOT, GENERATED_FEATURE_SEAMS_DOC), renderFeatureSeamsDoc(), 'utf8');
}

export function diffFeatureSeamsDoc(): { path: string; reason: string }[] {
  const absolute = join(ROOT, GENERATED_FEATURE_SEAMS_DOC);
  if (!existsSync(absolute)) {
    return [{ path: GENERATED_FEATURE_SEAMS_DOC, reason: 'generated reference is missing' }];
  }
  return readFileSync(absolute, 'utf8') === renderFeatureSeamsDoc()
    ? []
    : [{ path: GENERATED_FEATURE_SEAMS_DOC, reason: 'generated reference is stale' }];
}
''',
)


# 7) ADR-0007: current decision has no feature-to-feature seam escape hatch.
write(
    'docs/01-architecture/09-decisions/ADR-0007-application-feature-consolidation.md',
    '''# ADR-0007: Application Feature Consolidation under `src/features`

## Status

Accepted (2026-08), strengthened 2026-08-24

## Context

Application code was split across competing roots: `src/modules/`, `src/features/`, and global buckets (`src/components/`, `src/hooks/`, `src/lib/`, `src/theme/`, `src/locales/`). Architecture metadata for packages lived in `CAPABILITY_PACKAGES`, but application features had no registry, sealed doors, or generated reference documentation.

## Decision

1. **Single application feature root.** Every feature lives under `src/features/*`. `src/modules/` is forbidden and fails `architecture:check` if recreated.
2. **Approved `src/` roots only:** `app/`, `core/`, `features/`, `shared/`. Framework root files such as `instrumentation.ts` and `proxy.ts` may remain. Competing global buckets are forbidden.
3. **`src/shared/`** holds only cross-feature, domain-neutral application code.
4. **Canonical feature vocabulary.** Feature internals use the documented architectural layers; competing top-level aliases are default-deny.
5. **`APPLICATION_FEATURES` registry** in `@asol/architecture-core` is the machine-readable source of truth for every feature, its doors, runtimes, capability owners, and permitted feature dependencies.
6. **Sealed feature public APIs.** Cross-feature imports may use only declared `@/features/<name>`, `@/features/<name>/ui`, or `@/features/<name>/server` doors. Feature-to-feature deep imports and relative cross-feature traversal have **no exceptions**. A feature dependency also requires an explicit `permittedDependencies` edge.
7. **Composition-only exact seams.** Isolated composition/service-mirror packages may use exact `COMPOSITION_FEATURE_SEAMS` entries when a broad feature barrel would widen the deployment graph. This authority is unavailable to ordinary application features; entries must be exact, existing, used, and default-deny.
8. **Generated reference docs.** Architecture reference Markdown is generated from canonical registries and verified for drift by `architecture:check`.

## Consequences

- Positive: one application shape; default-deny feature ownership; real Public APIs at the feature boundary; no feature-internal escape hatch; no silent documentation drift; isolated service mirrors retain narrow dependency graphs.
- Negative: adding or changing a legitimate cross-feature dependency requires updating the target public door and the importer's `permittedDependencies` declaration.
- Supersedes ADR-0002's claim that wiring seams live under `src/modules/` and supersedes the earlier ADR-0007 allowance for exact feature-to-feature deep-import seams.

## Source Map

- Feature registry: `packages/architecture-core/src/registry/application-features-registry.ts`
- Exact composition seams: `packages/architecture-core/src/registry/composition-feature-seams-registry.ts`
- Checks: `application-features-contract.ts`, `feature-door-contract.ts`, `feature-dependency-contract.ts`, `architecture-docs-drift-contract.ts`
- Docs generators: `packages/architecture-core/src/docs/generate-architecture-docs.ts`, `packages/architecture-core/src/docs/generate-feature-seams-doc.ts`
- Attack tests: `scripts/architecture/application-features-attack.test.ts` plus `packages/architecture-core/src/tests/index.test.ts`

## Invariants

1. `src/modules/` does not exist.
2. Every `src/features/*` directory is registered in `APPLICATION_FEATURES`.
3. Cross-feature imports use declared Public API doors only; feature-to-feature deep imports never receive exception authority.
4. Every real feature dependency is declared and every declaration is used.
5. Generated architecture reference docs match their canonical registries.
6. Package sealing, mandatory gateways, runtime isolation, composition boundaries, and capability ownership remain intact.
7. Composition-package application imports are either declared feature doors or exact `COMPOSITION_FEATURE_SEAMS`; relative deep traversal never receives seam authority.
8. Static, dynamic, type-only, barrel, and re-export import forms remain visible to architecture enforcement.
''',
)


# 8) Delete obsolete registry itself.
obsolete = ROOT / 'packages/architecture-core/src/registry/feature-deep-import-seams-registry.ts'
if not obsolete.exists():
    raise SystemExit('expected obsolete feature deep-import seam registry to exist')
obsolete.unlink()

# No executable architecture source may retain feature-to-feature seam authority.
leftovers = []
for base in [ROOT / 'packages/architecture-core/src']:
    for file in base.rglob('*.ts'):
        text = file.read_text(encoding='utf-8')
        if 'FEATURE_DEEP_IMPORT_SEAMS' in text or 'deepImportSeams' in text:
            leftovers.append(str(file))
if leftovers:
    raise SystemExit('stale feature seam authority remains: ' + ', '.join(leftovers))

print(f'Public API finalizer: removed {property_count} feature seam declarations.')
