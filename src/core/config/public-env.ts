/**
 * Public (client-safe) environment values baked at build time.
 */

import { MINIMUM_SUPPORTED_NATIVE_VERSION } from '@/native-platform/capabilities/shell-capabilities';

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
  /**
   * Origin of the notifications deployment. Client-safe: the browser is the
   * only thing that calls it, and a signed grant — not this URL — is what
   * authorises a send.
   *
   * No fallback constant here on purpose. A static or native bundle has no
   * same-origin option, so `build-static.ts` resolves the value from
   * `CAPACITOR_NOTIFICATIONS_BASE_URL`, asserts it is absolute, and sets it
   * before the build. Importing that default here instead would pull
   * `platform/` into `next.config.ts` and break the static build's temp layout.
   */
  notificationsUrl:
    process.env.NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL?.replace(/\/$/, '') || '',
  /**
   * Origin of the products deployment. Client-safe: only the browser calls it,
   * and it serves read-only product data.
   *
   * Like the notifications origin, no fallback constant lives here — a static
   * or native build resolves and asserts it in `build-static.ts`.
   */
  productsUrl: process.env.NEXT_PUBLIC_ASOL_PRODUCTS_URL?.replace(/\/$/, '') || '',
  /**
   * Origin of the orders deployment. Client-safe: only the browser calls it,
   * and it serves the order list only — the detail view stays on the main app,
   * which is the side that can read profile contacts and store details.
   */
  ordersUrl: process.env.NEXT_PUBLIC_ASOL_ORDERS_URL?.replace(/\/$/, '') || '',
  /**
   * Origin of the profiles deployment. Client-safe: it serves profile reads
   * only — reviews stay on the main app because they also read the product
   * database.
   */
  profilesUrl: process.env.NEXT_PUBLIC_ASOL_PROFILES_URL?.replace(/\/$/, '') || '',
  otaManifestUrl: process.env.NEXT_PUBLIC_ASOL_OTA_MANIFEST_URL || '',
  otaPublicKey: process.env.NEXT_PUBLIC_ASOL_OTA_PUBLIC_KEY || '',
  webBundleVersion: process.env.NEXT_PUBLIC_ASOL_WEB_BUNDLE_VERSION || '0.1.0',
  nativeVersion:
    process.env.NEXT_PUBLIC_ASOL_NATIVE_VERSION ||
    MINIMUM_SUPPORTED_NATIVE_VERSION,
} as const;

/**
 * Origin of the notifications deployment, or null when it is not configured —
 * in which case the browser bridge simply delivers nothing.
 */
export function getNotificationsPublicUrl(): string | null {
  return publicEnv.notificationsUrl || null;
}

/** Prefix a public asset path with the deployment base path (e.g. `/asol` on GitHub Pages). */
export function withBasePath(path: string): string {
  const base = publicEnv.basePath.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
