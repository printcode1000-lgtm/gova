import { publicEnv, withBasePath } from '@/core/config/public-env';

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

export function buildAsolApiUrl(route: string): string {
  const base = resolveAsolApiBaseUrl().replace(/\/$/, '');
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
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
