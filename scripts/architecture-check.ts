import { runArchitectureCheck } from '@asol/architecture-core';
import { validateStorageProfilesAtStartup } from '@asol/storage-core/server';

import { validationEngine as categoryValidationEngine } from '../src/features/categories/infrastructure/validation.engine';

/**
 * The CLI around `@asol/architecture-core`.
 *
 * Two validations run before the scan and stay here rather than in the package: they need the
 * application's own category data and the storage profile file, and a package that reached for
 * either would be doing exactly what it exists to forbid.
 */
process.exit(
  runArchitectureCheck({
    preflight: [
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
