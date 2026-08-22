/**
 * Server config port — rule 7 the other way.
 *
 * Push providers and the grant protocol need a handful of secrets that live in the
 * application env layer. This package must not import `@/core/config/*`, so it names the
 * getters it needs and the application registers them through
 * `src/features/notifications/notifications-core-ports.ts`.
 *
 * Defaults fail closed: missing Web Push / APNs config returns null (providers already
 * treat that as "not configured"), while the grant secret and Firebase account throw —
 * those paths cannot usefully degrade.
 */

export interface FirebaseAdminServiceAccountConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface ApnsServerConfig {
  teamId: string;
  keyId: string;
  bundleId: string;
  privateKey: string;
  production: boolean;
}

export interface WebPushServerConfig {
  privateKey: string;
}

export interface NotificationsCoreServerConfigPort {
  getWebPushServerConfig(): WebPushServerConfig | null;
  getFirebaseAdminServiceAccount(): FirebaseAdminServiceAccountConfig;
  getApnsServerConfig(): ApnsServerConfig | null;
  getNotificationGrantSecret(): string;
}

const UNCONFIGURED: NotificationsCoreServerConfigPort = {
  getWebPushServerConfig: () => null,
  getFirebaseAdminServiceAccount: () => {
    throw new Error('notificationsCorePort: Firebase admin service account is not configured');
  },
  getApnsServerConfig: () => null,
  getNotificationGrantSecret: () => {
    throw new Error('notificationsCorePort: notification grant secret is not configured');
  },
};

let port: NotificationsCoreServerConfigPort = UNCONFIGURED;

export function configureNotificationsCoreServerConfig(
  next: Partial<NotificationsCoreServerConfigPort>,
): void {
  port = { ...port, ...next };
}

export function resetNotificationsCoreServerConfig(): void {
  port = UNCONFIGURED;
}

export function getWebPushServerConfig(): WebPushServerConfig | null {
  return port.getWebPushServerConfig();
}

export function getFirebaseAdminServiceAccount(): FirebaseAdminServiceAccountConfig {
  return port.getFirebaseAdminServiceAccount();
}

export function getApnsServerConfig(): ApnsServerConfig | null {
  return port.getApnsServerConfig();
}

export function getNotificationGrantSecret(): string {
  return port.getNotificationGrantSecret();
}
