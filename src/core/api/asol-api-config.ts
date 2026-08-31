import { publicEnv, withBasePath } from '@/core/config/public-env';
import { resolveRequiredServiceOrigin } from '@asol/account-bridge';

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
 * Every Business API method resolves to exactly one owning deployment through
 * the canonical registry, and to that deployment's configured origin. There is
 * no fallback: an unowned method or a missing origin throws rather than being
 * silently sent to the page origin, because that substitution is what let a
 * business call reach gova after gova stopped implementing business routes.
 *
 * The bridge answers `null` on the server, so a server-rendered business
 * request raises the same configuration error — the deployments must not call
 * each other. Non-business paths (`/api/health`, `/api/dev/**`, public assets)
 * are unowned by design and keep using the page origin.
 */
export function buildAsolApiUrl(route: string, method = 'GET'): string {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  const serviceOrigin = resolveRequiredServiceOrigin(method, normalizedRoute);
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
