import { getPlatformName } from '@asol/native-core';
import { accountBridgePublicEnv } from './ports/app-bridge';
import type { AppDeployment, AppPlatform } from './ports/app-bridge';
import { isBusinessApiPath, resolveRouteOwner } from './routes';
import type { ApiOwner } from './routes';

export type ServiceKey = ApiOwner;

export type BridgeHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

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
  const owner = resolveRouteOwner(method, pathOf(route));
  if (!owner) return null;
  return runtime.origins[owner] || null;
}

function detectPlatform(): AppPlatform {
  const name = getPlatformName();
  return name === 'android' || name === 'ios' ? name : 'web';
}

function detectDeployment(platform: AppPlatform): AppDeployment {
  if (isNativePlatform(platform)) return 'static-export';
  if (accountBridgePublicEnv().mode.trim().toLowerCase() === 'static') return 'static-export';
  return accountBridgePublicEnv().developmentBuild ? 'local-development' : 'web-production';
}

export function resolveServiceOrigin(
  method: string,
  route: string,
): string | null {
  const platform = detectPlatform();
  return resolveServiceOriginForRuntime(method, route, {
    browser: isBrowser(),
    developmentBuild: accountBridgePublicEnv().developmentBuild,
    platform,
    deployment: detectDeployment(platform),
    origins: {
      control: accountBridgePublicEnv().controlUrl,
      notifications: accountBridgePublicEnv().notificationsUrl,
      products: accountBridgePublicEnv().productsUrl,
      orders: accountBridgePublicEnv().ordersUrl,
      profiles: accountBridgePublicEnv().profilesUrl,
      submain: accountBridgePublicEnv().submainUrl,
      sub2main: accountBridgePublicEnv().sub2mainUrl,
    },
  });
}

/** Missing ownership/origin for a business route is a configuration error, never a gova fallback. */
export function resolveRequiredServiceOrigin(method: string, route: string): string | null {
  const origin = resolveServiceOrigin(method, route);
  if (!origin && isBusinessApiPath(route)) {
    throw new Error(`ASOL API route has no configured owner origin: ${method.toUpperCase()} ${pathOf(route)}`);
  }
  return origin;
}

export { configureAccountBridge, resetAccountBridgePorts } from './ports/app-bridge';
