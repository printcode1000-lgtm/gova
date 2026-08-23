/**
 * Fail architecture:check when generated architecture reference docs drift
 * from the canonical machine-readable registries.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import {
  GENERATED_ARCHITECTURE_DOCS,
  diffArchitectureDocs,
  renderArchitectureDoc,
  type ArchitectureDocId,
} from '../docs/generate-architecture-docs';
import { diffFeatureSeamsDoc } from '../docs/generate-feature-seams-doc';
import { ROOT, addViolation } from './architecture-types';

const ARCHITECTURE_DOC_IDS = new Set<string>(GENERATED_ARCHITECTURE_DOCS);

function firstMismatchDetail(path: string): string | null {
  if (!ARCHITECTURE_DOC_IDS.has(path)) return null;
  const absolute = join(ROOT, path);
  if (!existsSync(absolute)) return null;

  const expected = renderArchitectureDoc(path as ArchitectureDocId).split('\n');
  const actual = readFileSync(absolute, 'utf8').split('\n');
  const max = Math.max(expected.length, actual.length);
  for (let index = 0; index < max; index += 1) {
    if (expected[index] === actual[index]) continue;
    const expectedLine = expected[index] ?? '<EOF>';
    const actualLine = actual[index] ?? '<EOF>';
    return `first mismatch at line ${index + 1}; expected ${JSON.stringify(expectedLine)}, actual ${JSON.stringify(actualLine)}`;
  }
  return null;
}

export function checkArchitectureDocsDriftContract(): void {
  for (const diff of [...diffArchitectureDocs(), ...diffFeatureSeamsDoc()]) {
    const detail = firstMismatchDetail(diff.path);
    addViolation(
      'Architecture Docs Drift',
      join(ROOT, diff.path),
      `${diff.path}: ${diff.reason}${detail ? `; ${detail}` : ''}.`,
      'Run `npm run architecture:docs` and commit the regenerated files. Do not edit generated docs by hand.',
    );
  }
}
