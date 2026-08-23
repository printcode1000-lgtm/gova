/**
 * Deterministic reference documentation for exceptional feature seams.
 *
 * The registries are canonical. This file only renders them; the drift check
 * fails if the committed Markdown differs byte-for-byte from this output.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { COMPOSITION_FEATURE_SEAMS } from '../registry/composition-feature-seams-registry';
import { FEATURE_DEEP_IMPORT_SEAMS } from '../registry/feature-deep-import-seams-registry';

const ROOT = process.cwd();

export const GENERATED_FEATURE_SEAMS_DOC =
  'docs/01-architecture/08-reference/feature-seams.md' as const;

function tableEscape(value: string): string {
  return value.replace(/\|/g, '\\|');
}

export function renderFeatureSeamsDoc(): string {
  const featureRows = Object.entries(FEATURE_DEEP_IMPORT_SEAMS)
    .flatMap(([owner, seams]) => seams.map((path) => `| \`${tableEscape(owner)}\` | \`${tableEscape(path)}\` |`));
  const compositionRows = Object.entries(COMPOSITION_FEATURE_SEAMS)
    .flatMap(([owner, seams]) => seams.map((path) => `| \`${tableEscape(owner)}\` | \`${tableEscape(path)}\` |`));

  const featureCount = featureRows.length;
  const compositionCount = compositionRows.length;

  return [
    '<!-- GENERATED FILE — DO NOT EDIT. Run `npm run architecture:docs`. -->',
    '',
    '# Exact Feature Seams',
    '',
    'This reference is generated from the machine-readable seam registries owned by `@asol/architecture-core`.',
    'Public feature doors remain the default boundary. A deep path has no authority unless it is registered exactly and remains in active use; stale entries fail `architecture:check`.',
    '',
    'Canonical sources:',
    '- `packages/architecture-core/src/registry/application-features-registry.ts` — declares allowed target-feature relationships, but grants no deep-path authority by itself.',
    '- `packages/architecture-core/src/registry/feature-deep-import-seams-registry.ts` — exact feature-to-feature source modules.',
    '- `packages/architecture-core/src/registry/composition-feature-seams-registry.ts` — exact composition/service-mirror source modules.',
    '',
    `Current inventory: **${featureCount}** exact feature-to-feature seam path(s) and **${compositionCount}** exact composition seam path(s).`,
    '',
    '## Feature-to-feature exact seams',
    '',
    '| Importer feature | Exact target module |',
    '| --- | --- |',
    ...(featureRows.length > 0 ? featureRows : ['| — | — |']),
    '',
    '## Composition/service-mirror exact seams',
    '',
    'These exceptions exist because isolated service mirrors follow the real import graph. Importing a broad application barrel can pull capabilities or npm dependencies into an account that must not own them.',
    '',
    '| Composition package | Exact application module |',
    '| --- | --- |',
    ...(compositionRows.length > 0 ? compositionRows : ['| — | — |']),
    '',
    '## Enforcement',
    '',
    '- Unknown deep imports fail.',
    '- Relative traversal cannot bypass composition seams.',
    '- A feature target declaration without an exact path fails.',
    '- An exact feature seam whose target relationship is not declared fails.',
    '- Missing, duplicate, or unused seam entries fail.',
    '- Declared public doors (`.`, `/ui`, `/server`) do not belong in these exception registries.',
    '',
  ].join('\n');
}

export function writeFeatureSeamsDoc(): void {
  writeFileSync(join(ROOT, GENERATED_FEATURE_SEAMS_DOC), renderFeatureSeamsDoc(), 'utf8');
}

export function diffFeatureSeamsDoc(): { path: string; reason: string }[] {
  const absolute = join(ROOT, GENERATED_FEATURE_SEAMS_DOC);
  if (!existsSync(absolute)) {
    return [{ path: GENERATED_FEATURE_SEAMS_DOC, reason: 'generated reference is missing' }];
  }
  const expected = renderFeatureSeamsDoc();
  const actual = readFileSync(absolute, 'utf8');
  return actual === expected
    ? []
    : [{ path: GENERATED_FEATURE_SEAMS_DOC, reason: 'generated reference is stale' }];
}
