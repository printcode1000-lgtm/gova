import { getPlatformName } from '@asol/native-core';
import { publicEnv } from '@/core/config/public-env';
import type { AppDeployment, AppPlatform } from '@/core/config/runtime-context';

export type ServiceKey = 'products' | 'orders' | 'profiles' | 'submain' | 'sub2main';

export type BridgeHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type { AppDeployment, AppPlatform };

export interface ServiceBridgeRuntime {
  browser: boolean;
  developmentBuild: boolean;
  platform: AppPlatform;
  deployment: AppDeployment;
  origins: Record<ServiceKey, string>;
}

export function isNativePlatform(platform: AppPlatform): boolean {
  return platform === 'android' || platform === 'ios';
}

export function usesLocalDevelopmentFallback(runtime: ServiceBridgeRuntime): boolean {
  if (isNativePlatform(runtime.platform)) return false;
  return runtime.developmentBuild || runtime.deployment === 'local-development';
}

export const READ_ROUTES: Record<string, ServiceKey> = {
  '/api/products': 'products',
  '/api/products/reviews': 'products',
  '/api/pharmacy-profile-catalog': 'products',
  '/api/orders': 'orders',
  '/api/profile/contacts': 'profiles',
  '/api/profile/store-details': 'profiles',
  '/api/profile/specialties': 'profiles',
  '/api/profile/fulfillment-settings': 'profiles',
  '/api/profile/users-by-specialty': 'profiles',
};

export const SUBMAIN_ROUTES: Record<string, readonly BridgeHttpMethod[]> = {
  '/api/search/products': ['GET'],
  '/api/search/fields': ['GET'],
  '/api/search/sellers': ['GET'],
  '/api/orders/from-cart': ['POST'],
  '/api/orders/custom-request-from-profile': ['POST'],
};

/** Seller profile writes, product mutations, and storage uploads. */
export const SUB2MAIN_ROUTES: Record<string, readonly BridgeHttpMethod[]> = {
  '/api/products': ['POST', 'PUT', 'DELETE'],
  '/api/profile/editor': ['PUT'],
  '/api/profile/contacts': ['PUT'],
  '/api/profile/store-details': ['PUT'],
  '/api/profile/store-images': ['PUT'],
  '/api/profile/specialties': ['PUT'],
  '/api/profile/fulfillment-settings': ['PUT'],
  '/api/profile/discounts': ['PUT'],
  '/api/profile/discounts/quote': ['POST'],
  '/api/storage/images/upload': ['POST'],
  '/api/pharmacy-profile-catalog': ['POST'],
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function pathOf(route: string): string {
  const queryIndex = route.indexOf('?');
  return queryIndex === -1 ? route : route.slice(0, queryIndex);
}

function resolveWorkloadOrigin(
  method: string,
  path: string,
  routes: Record<string, readonly BridgeHttpMethod[]>,
  origin: string,
): string | null {
  const normalizedMethod = method.toUpperCase() as BridgeHttpMethod;
  const allowed = routes[path];
  if (!allowed?.includes(normalizedMethod)) return null;
  return origin || null;
}

export function resolveServiceOriginForRuntime(
  method: string,
  route: string,
  runtime: ServiceBridgeRuntime,
): string | null {
  if (!runtime.browser) return null;
  if (usesLocalDevelopmentFallback(runtime)) return null;

  const path = pathOf(route);
  const submain = resolveWorkloadOrigin(method, path, SUBMAIN_ROUTES, runtime.origins.submain);
  if (submain) return submain;

  const sub2main = resolveWorkloadOrigin(method, path, SUB2MAIN_ROUTES, runtime.origins.sub2main);
  if (sub2main) return sub2main;

  if (method.toUpperCase() !== 'GET') return null;
  const service = READ_ROUTES[path];
  if (!service) return null;
  return runtime.origins[service] || null;
}

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
      submain: publicEnv.submainUrl,
      sub2main: publicEnv.sub2mainUrl,
    },
  });
}
