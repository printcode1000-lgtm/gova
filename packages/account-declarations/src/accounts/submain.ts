import {
  GOVA_RUNTIME_OPTIONAL_ENV_KEYS,
  GOVA_RUNTIME_REQUIRED_ENV_KEYS,
} from './gova-runtime-env-keys';

/**
 * Secondary full-application deployment for isolated UI and feature work.
 *
 * Deployed from the repository root via CLI (never GitHub-linked). Holds the same
 * runtime database and session secrets as the primary app, but never receives
 * deploy tokens for other Vercel accounts.
 */
export const SUBMAIN_DECLARATION = {
  name: 'submain',
  project: 'submain',
  tokenEnvVar: 'VERCEL_SUBMAIN_TOKEN',
  deployFromRepositoryRoot: true,
  serviceDir: undefined,
  requiredEnv: GOVA_RUNTIME_REQUIRED_ENV_KEYS,
  optionalEnv: GOVA_RUNTIME_OPTIONAL_ENV_KEYS,
  mirrorEntryPoints: [],
  runtimeAssets: [],
} as const;
