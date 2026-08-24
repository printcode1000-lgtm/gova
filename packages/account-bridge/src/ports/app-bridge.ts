/**
 * App bridge port — rule 7 the other way.
 *
 * The channel needs public-env leaves and notification-grant helpers that live in
 * the application. This package names the surface; the app registers implementations
 * through `src/features/account-bridge/ports/account-bridge-portsState().ts`.
 */

export type AppPlatform = "web" | "android" | "ios";
export type AppDeployment = "local-development" | "web-production" | "static-export";

export interface AccountBridgePublicEnv {
  developmentBuild: boolean;
  basePath: string;
  mode: string;
  apiBaseUrl: string;
  productsUrl: string;
  ordersUrl: string;
  profilesUrl: string;
  submainUrl: string;
  sub2mainUrl: string;
  mobilePushCredentialBlob: string;
}

export interface NotificationGrantDeliveryIdentity {
  uid: string;
  phone: string;
}

export interface AccountBridgePorts {
  publicEnv: AccountBridgePublicEnv;
  getNotificationsPublicUrl(): string | null;
  readNotificationGrants(body: unknown): string[];
  getNotificationGrantDeliveryIdentity(): NotificationGrantDeliveryIdentity | null;
}

const UNCONFIGURED_ENV: AccountBridgePublicEnv = {
  developmentBuild: false,
  basePath: '',
  mode: '',
  apiBaseUrl: '',
  productsUrl: '',
  ordersUrl: '',
  profilesUrl: '',
  submainUrl: '',
  sub2mainUrl: '',
  mobilePushCredentialBlob: '',
};

/**
 * The registration lives on `globalThis`, not in this module's scope.
 *
 * A bundler may give one source file more than one instance: Next builds
 * `instrumentation` and each route into separate chunks, and Turbopack emitted
 * two copies of `data-core`'s runtime-config port — the composition root
 * configured one while every route read the other, and production answered 500
 * on every server route. Static checks and `tsx` tests cannot see it, because
 * Node resolves one path to one instance.
 *
 * A `Symbol.for` key on the global object is the same value from whichever
 * instance asks, which is what "configure once at startup" has to mean here.
 */
const PORTS_KEY = Symbol.for('@asol/account-bridge/app-bridge');

interface AccountBridgePortsCarrier {
  [PORTS_KEY]?: AccountBridgePorts;
}

const portsDefaults = (): AccountBridgePorts => ({
  publicEnv: UNCONFIGURED_ENV,
  getNotificationsPublicUrl: () => null,
  readNotificationGrants: () => [],
  getNotificationGrantDeliveryIdentity: () => null,
});

function portsState(): AccountBridgePorts {
  const carrier = globalThis as AccountBridgePortsCarrier;
  carrier[PORTS_KEY] ??= portsDefaults();
  return carrier[PORTS_KEY]!;
}

function setPortsState(next: AccountBridgePorts): void {
  (globalThis as AccountBridgePortsCarrier)[PORTS_KEY] = next;
}

export function configureAccountBridge(next: Partial<AccountBridgePorts>): void {
  setPortsState({ ...portsState(), ...next });
}

export function resetAccountBridgePorts(): void {
  setPortsState({
    publicEnv: UNCONFIGURED_ENV,
    getNotificationsPublicUrl: () => null,
    readNotificationGrants: () => [],
    getNotificationGrantDeliveryIdentity: () => null,
  });
}

export function accountBridgePublicEnv(): AccountBridgePublicEnv {
  return portsState().publicEnv;
}

export function getNotificationsPublicUrl(): string | null {
  return portsState().getNotificationsPublicUrl();
}

export function readNotificationGrants(body: unknown): string[] {
  return portsState().readNotificationGrants(body);
}

export function getNotificationGrantDeliveryIdentity(): NotificationGrantDeliveryIdentity | null {
  return portsState().getNotificationGrantDeliveryIdentity();
}
