/** Deterministic reference documentation for exact composition/service-mirror seams. */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { COMPOSITION_FEATURE_SEAMS } from '../registry/composition-feature-seams-registry';

const ROOT = process.cwd();

export const GENERATED_FEATURE_SEAMS_DOC =
  'docs/01-architecture/08-reference/feature-seams.md' as const;

function tableEscape(value: string): string {
  return value.replace(/\|/g, '\\|');
}

export function renderFeatureSeamsDoc(): string {
  const rows = Object.entries(COMPOSITION_FEATURE_SEAMS).flatMap(([owner, seams]) =>
    seams.map((path) => `| \`${tableEscape(owner)}\` | \`${tableEscape(path)}\` |`),
  );

  return [
    '<!-- GENERATED FILE — DO NOT EDIT. Run `npm run architecture:docs`. -->',
    '',
    '# Composition Feature Seams',
    '',
    'Feature-to-feature dependencies have no deep-import exceptions: they must use declared Public API doors.',
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
    '- Relative traversal cannot bypass feature Public API doors or composition seams.',
    '- Composition seams must be exact, existing, registered, and actively used.',
    '- Stale, duplicate, missing, or broad composition seam authority fails `architecture:check`.',
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
  return readFileSync(absolute, 'utf8') === renderFeatureSeamsDoc()
    ? []
    : [{ path: GENERATED_FEATURE_SEAMS_DOC, reason: 'generated reference is stale' }];
}
