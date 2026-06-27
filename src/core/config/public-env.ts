/**
 * Public (client-safe) environment values baked at build time.
 */

const LEGACY_API_URL_KEY = 'NEXT_PUBLIC_GOVA_API_URL';

export const publicEnv = {
  basePath: process.env.NEXT_PUBLIC_GOVA_BASE_PATH || '',
  apiBaseUrl:
    process.env.NEXT_PUBLIC_GOVA_API_BASE_URL?.replace(/\/$/, '') ||
    process.env[LEGACY_API_URL_KEY]?.replace(/\/$/, '') ||
    process.env.GOVA_API_BASE_URL?.replace(/\/$/, '') ||
    '',
  buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? 'default',
} as const;
