import type { AppRuntimeContext } from '@/core/config';
import type { TranslationKey } from '@/shared/i18n';

export type NetworkDisplayEnvironment =
  | 'development'
  | 'web'
  | 'static-web'
  | 'android'
  | 'ios';

export type NetworkRestoredFrom = 'offline' | 'server-unreachable' | 'check-failed';

export function resolveNetworkDisplayEnvironment(
  runtime: AppRuntimeContext,
  developmentBuild: boolean,
): NetworkDisplayEnvironment {
  if (runtime.platform === 'android') return 'android';
  if (runtime.platform === 'ios') return 'ios';
  if (developmentBuild && !runtime.isNative) return 'development';
  if (runtime.isStatic) return 'static-web';
  return 'web';
}

export function serverUnavailableMessageKey(
  environment: NetworkDisplayEnvironment,
): TranslationKey {
  if (environment === 'development') return 'network.serverUnavailable.development';
  if (environment === 'static-web') return 'network.serverUnavailable.static';
  if (environment === 'android') return 'network.serverUnavailable.android';
  if (environment === 'ios') return 'network.serverUnavailable.ios';
  return 'network.serverUnavailable.web';
}

export function restoredMessageKey(
  restoredFrom: NetworkRestoredFrom,
  environment: NetworkDisplayEnvironment,
): TranslationKey {
  if (restoredFrom === 'offline') return 'network.networkAndServerRestored';
  if (restoredFrom === 'check-failed') return 'network.checkRestored';
  if (environment === 'development') return 'network.serverRestored.development';
  return 'network.serverRestored';
}
