import { getPlatformName } from '@asol/native-core';
import { publicEnv } from '@/core/config/public-env';
import type { AppDeployment, AppPlatform } from '@/core/config/runtime-context';

export type ServiceKey = 'products' | 'orders' | 'profiles';

export type { AppDeployment, AppPlatform };

/**
 * What the channel needs to know about the host it is running on.
 *
 * `platform` and `deployment` are the same vocabulary `runtime-context.ts`
 * uses; a second one would let the two drift.
 */
export interface ServiceBridgeRuntime {
  browser: boolean;
  developmentBuild: boolean;
  platform: AppPlatform;
  deployment: AppDeployment;
  origins: Record<ServiceKey, string>;
}

/** Android and iOS run the same bundle inside a Capacitor WebView. */
export function isNativePlatform(platform: AppPlatform): boolean {
  return platform === 'android' || platform === 'ios';
}

/**
 * Whether the channel must stand down and let the main application serve.
 *
 * Only a genuine local web development session qualifies. A Capacitor WebView
 * is served from a `localhost`-like origin and a `static-export` deployment, so
 * a check that looked only at the origin — or only at `developmentBuild` —
 * would read Android and iOS as "development" and silently route every read
 * back to the main account. That would disable the service split on exactly the
 * platforms that cannot be hot-fixed without a store release.
 */
export function usesLocalDevelopmentFallback(runtime: ServiceBridgeRuntime): boolean {
  if (isNativePlatform(runtime.platform)) return false;
  return runtime.developmentBuild || runtime.deployment === 'local-development';
}

/**
  Exact 11 read routes served by dedicated Vercel service accounts.
 
  Exact matching, never prefix.
 
  Exclusions with reasons intact:
  - `/api/orders/:id`: detail view enriches with profile contacts and store details, which orders account cannot read.
  - `/api/search/sellers`: despite the name it reads profile shards, not products.
  - `/api/profile/reviews`: reads product database as well as profile shards.
 */
export const READ_ROUTES: Record<string, ServiceKey> = {
  '/api/products': 'products',
  '/api/products/reviews': 'products',
  '/api/search/products': 'products',
  '/api/search/fields': 'products',
  '/api/pharmacy-profile-catalog': 'products',
  '/api/orders': 'orders',
  '/api/profile/contacts': 'profiles',
  '/api/profile/store-details': 'profiles',
  '/api/profile/specialties': 'profiles',
  '/api/profile/fulfillment-settings': 'profiles',
  '/api/profile/users-by-specialty': 'profiles',
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function pathOf(route: string): string {
  const queryIndex = route.indexOf('?');
  return queryIndex === -1 ? route : route.slice(0, queryIndex);
}

export function resolveServiceOriginForRuntime(
  method: string,
  route: string,
  runtime: ServiceBridgeRuntime,
): string | null {
  if (!runtime.browser) return null;
  if (usesLocalDevelopmentFallback(runtime)) return null;
  if (method.toUpperCase() !== 'GET') return null;
  const service = READ_ROUTES[pathOf(route)];
  if (!service) return null;
  return runtime.origins[service] || null;
}

/**
 * Platform identity is owned by `@asol/native-core`, and is read through its
 * public API rather than re-derived here. A second detector would be a second
 * source of truth, and the two would disagree the first time either changed.
 */
function detectPlatform(): AppPlatform {
  const name = getPlatformName();
  return name === 'android' || name === 'ios' ? name : 'web';
}

function detectDeployment(platform: AppPlatform): AppDeployment {
  if (isNativePlatform(platform)) return 'static-export';
  if (publicEnv.mode.trim().toLowerCase() === 'static') return 'static-export';
  return publicEnv.developmentBuild ? 'local-development' : 'web-production';
}

export function resolveServiceOrigin(
  method: string,
  route: string,
): string | null {
  const platform = detectPlatform();
  return resolveServiceOriginForRuntime(method, route, {
    browser: isBrowser(),
    developmentBuild: publicEnv.developmentBuild,
    platform,
    deployment: detectDeployment(platform),
    origins: {
      products: publicEnv.productsUrl,
      orders: publicEnv.ordersUrl,
      profiles: publicEnv.profilesUrl,
    },
  });
}
