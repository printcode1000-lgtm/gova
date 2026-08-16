export const REQUIRED_ENV_KEYS = [] as const;
export const OPTIONAL_ENV_KEYS = [] as const;

export const GOVA_DECLARATION = {
  name: 'gova',
  project: 'gova',
  tokenEnvVar: 'VERCEL_TOKEN',
  serviceDir: undefined,
  requiredEnv: [],
  optionalEnv: [],
  mirrorEntryPoints: [],
  runtimeAssets: [],
} as const;
