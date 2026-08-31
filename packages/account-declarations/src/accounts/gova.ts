import {
  GOVA_FRONTEND_OPTIONAL_ENV_KEYS,
  GOVA_FRONTEND_REQUIRED_ENV_KEYS,
} from './gova-runtime-env-keys';

/**
 * gova after the cutover: the only GitHub-linked project, and a frontend.
 *
 * It requires the seven owner origins because its compatibility boundary
 * redirects to them, and nothing more. A frontend that declared a database or a
 * signing secret would be asking for a credential no code in it can use.
 */
export const REQUIRED_ENV_KEYS = GOVA_FRONTEND_REQUIRED_ENV_KEYS;
export const OPTIONAL_ENV_KEYS = GOVA_FRONTEND_OPTIONAL_ENV_KEYS;

export const GOVA_DECLARATION = {
  name: 'gova',
  project: 'gova',
  email: 'print.code.1000@gmail.com',
  tokenEnvVar: 'VERCEL_TOKEN',
  serviceDir: undefined,
  requiredEnv: REQUIRED_ENV_KEYS,
  optionalEnv: OPTIONAL_ENV_KEYS,
  mirrorEntryPoints: [],
  runtimeAssets: [],
} as const;
