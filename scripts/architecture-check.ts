import { runArchitectureCheck } from '@asol/architecture-core';
import { validateStorageProfilesAtStartup } from '@asol/storage-core/server';

import { validationEngine as categoryValidationEngine } from '../src/features/categories/infrastructure/validation.engine';
import { validateAgentKnowledge } from './docs/check';
import { verifyGeneratedGateContract } from './generated-gate-contract';
import { verifyGithubCiPolicy } from './github-ci-policy';
import { validateRuntimeCompatibilityReference } from './runtime-compatibility-reference';
import { checkStaticDomIds } from './ui-registry/static-dom-ids/check-static-dom-ids';
import { checkUidCoverage } from './ui-registry/uid-migration/check-uid-coverage';

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
        label: 'runtime compatibility reference failed',
        run: () => validateRuntimeCompatibilityReference(),
      },
      {
        label: 'generated Build/Test gate contract failed',
        run: () => verifyGeneratedGateContract(),
      },
      {
        label: 'GitHub CI policy failed',
        run: () => verifyGithubCiPolicy(),
      },
      {
        label: 'agent knowledge documentation contract failed',
        run: () => validateAgentKnowledge(),
      },
      {
        label: 'static DOM id contract failed',
        run: () => checkStaticDomIds(process.cwd()),
      },
      {
        label: 'UI identity coverage contract failed',
        run: () => checkUidCoverage(process.cwd()),
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
