import { runArchitectureCheck } from '@asol/architecture-core';
import { validateStorageProfilesAtStartup } from '@asol/storage-core/server';

import { validationEngine as categoryValidationEngine } from '../src/features/categories/infrastructure/validation.engine';
import { verifyGeneratedGateContract } from './generated-gate-contract';

/**
 * The CLI around `@asol/architecture-core`.
 *
 * Application-owned validations stay here rather than in the package: a sealed architecture
 * package must never reach back into application data or generated gate orchestration.
 */
process.exit(
  runArchitectureCheck({
    preflight: [
      {
        label: 'generated Build/Test gate contract failed',
        run: () => verifyGeneratedGateContract(),
      },
      {
        label: 'storage-profiles.json validation failed',
        run: () => {
          try {
            validateStorageProfilesAtStartup();
            return [];
          } catch (error) {
            return [error instanceof Error ? error.message : String(error)];
          }
        },
      },
      {
        label: 'category data validation failed',
        run: () => {
          const result = categoryValidationEngine.validate();
          return result.valid ? [] : result.errors;
        },
      },
    ],
  }),
);
