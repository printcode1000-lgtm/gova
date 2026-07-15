/**
 * Public (client-safe) environment values baked at build time.
 */

const LEGACY_API_URL_KEY = 'NEXT_PUBLIC_ASOL_API_URL';

export const publicEnv = {
  basePath: process.env.NEXT_PUBLIC_ASOL_BASE_PATH || '',
  mode: process.env.NEXT_PUBLIC_ASOL_MODE || '',
  apiBaseUrl:
    process.env.NEXT_PUBLIC_ASOL_API_BASE_URL?.replace(/\/$/, '') ||
    process.env[LEGACY_API_URL_KEY]?.replace(/\/$/, '') ||
    process.env.ASOL_API_BASE_URL?.replace(/\/$/, '') ||
    '',
  buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? 'default',
  r2PublicUrl: process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '') || '',
  otaManifestUrl: process.env.NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL || '',
  otaPublicKey: process.env.NEXT_PUBLIC_ASOL_OTA_PUBLIC_KEY || '',
  webBundleVersion: process.env.NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION || '0.1.0',
  nativeVersion: process.env.NEXT_PUBLIC_ASOL_NATIVE_VERSION || '1.0.0',
} as const;

/** Prefix a public asset path with the deployment base path (e.g. `/asol` on GitHub Pages). */
export function withBasePath(path: string): string {
  const base = publicEnv.basePath.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
