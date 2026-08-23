/**
 * Fail architecture:check when generated architecture reference docs drift
 * from the canonical machine-readable registries.
 */
import { join } from 'path';

import { diffArchitectureDocs } from '../docs/generate-architecture-docs';
import { ROOT, addViolation } from './architecture-types';

export function checkArchitectureDocsDriftContract(): void {
  for (const diff of diffArchitectureDocs()) {
    addViolation(
      'Architecture Docs Drift',
      join(ROOT, diff.path),
      `${diff.path}: ${diff.reason}.`,
      'Run `npm run architecture:docs` and commit the regenerated files. Do not edit generated docs by hand.',
    );
  }
}
