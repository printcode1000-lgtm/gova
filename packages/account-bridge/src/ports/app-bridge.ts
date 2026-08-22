/**
 * App bridge port — rule 7 the other way.
 *
 * The channel needs public-env leaves and notification-grant helpers that live in
 * the application. This package names the surface; the app registers implementations
 * through `src/features/account-bridge/account-bridge-ports.ts`.
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

let ports: AccountBridgePorts = {
  publicEnv: UNCONFIGURED_ENV,
  getNotificationsPublicUrl: () => null,
  readNotificationGrants: () => [],
  getNotificationGrantDeliveryIdentity: () => null,
};

export function configureAccountBridge(next: Partial<AccountBridgePorts>): void {
  ports = { ...ports, ...next };
}

export function resetAccountBridgePorts(): void {
  ports = {
    publicEnv: UNCONFIGURED_ENV,
    getNotificationsPublicUrl: () => null,
    readNotificationGrants: () => [],
    getNotificationGrantDeliveryIdentity: () => null,
  };
}

export function accountBridgePublicEnv(): AccountBridgePublicEnv {
  return ports.publicEnv;
}

export function getNotificationsPublicUrl(): string | null {
  return ports.getNotificationsPublicUrl();
}

export function readNotificationGrants(body: unknown): string[] {
  return ports.readNotificationGrants(body);
}

export function getNotificationGrantDeliveryIdentity(): NotificationGrantDeliveryIdentity | null {
  return ports.getNotificationGrantDeliveryIdentity();
}
