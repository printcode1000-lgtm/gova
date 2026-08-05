import { publicEnv, withBasePath } from '@/core/config/public-env';
import { resolveProductsServiceOrigin } from '@/modules/products-bridge';

/**
 * ASOL API configuration — platform-agnostic.
 */

export function resolveAsolApiBaseUrl(): string {
  if (publicEnv.apiBaseUrl) return publicEnv.apiBaseUrl;

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${publicEnv.basePath}`.replace(/\/$/, '');
  }

  return publicEnv.basePath.replace(/\/$/, '');
}

/**
 * Where a request is addressed.
 *
 * Product reads go to the products deployment when the browser bridge says so;
 * everything else goes to the main app. The bridge answers `null` on the server,
 * so a server-rendered request can never be pointed at the products account —
 * the two backends must not call each other.
 */
export function buildAsolApiUrl(route: string, method = 'GET'): string {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  const productsOrigin = resolveProductsServiceOrigin(method, normalizedRoute);
  const base = (productsOrigin ?? resolveAsolApiBaseUrl()).replace(/\/$/, '');
  return `${base}${normalizedRoute}`;
}

export function buildPublicAssetUrl(path: string): string {
  const assetPath = withBasePath(path);
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'file:') {
      return assetPath.startsWith('/') ? `.${assetPath}` : assetPath;
    }

    return new URL(assetPath, `${window.location.origin}/`).toString();
  }
  return assetPath;
}
