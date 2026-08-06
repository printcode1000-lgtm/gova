import { publicEnv, withBasePath } from '@/core/config/public-env';
import { resolveServiceOrigin } from '@/modules/service-bridge';

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
 * A read that a service owns goes to that deployment when the browser bridge
 * says so; everything else goes to the main app. The bridge answers `null` on
 * the server, so a server-rendered request can never be pointed at another
 * account — the deployments must not call each other.
 */
export function buildAsolApiUrl(route: string, method = 'GET'): string {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  const serviceOrigin = resolveServiceOrigin(method, normalizedRoute);
  const base = (serviceOrigin ?? resolveAsolApiBaseUrl()).replace(/\/$/, '');
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
