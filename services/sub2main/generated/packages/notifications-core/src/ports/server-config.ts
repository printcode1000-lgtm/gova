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
const PORT_KEY = Symbol.for('@asol/notifications-core/server-config');

interface NotificationsCoreServerConfigPortCarrier {
  [PORT_KEY]?: NotificationsCoreServerConfigPort;
}

const portDefaults = (): NotificationsCoreServerConfigPort => (UNCONFIGURED);

function portState(): NotificationsCoreServerConfigPort {
  const carrier = globalThis as NotificationsCoreServerConfigPortCarrier;
  carrier[PORT_KEY] ??= portDefaults();
  return carrier[PORT_KEY]!;
}

function setPortState(next: NotificationsCoreServerConfigPort): void {
  (globalThis as NotificationsCoreServerConfigPortCarrier)[PORT_KEY] = next;
}

export function configureNotificationsCoreServerConfig(
  next: Partial<NotificationsCoreServerConfigPort>,
): void {
  setPortState({ ...portState(), ...next });
}

export function resetNotificationsCoreServerConfig(): void {
  setPortState(UNCONFIGURED);
}

export function getWebPushServerConfig(): WebPushServerConfig | null {
  return portState().getWebPushServerConfig();
}

export function getFirebaseAdminServiceAccount(): FirebaseAdminServiceAccountConfig {
  return portState().getFirebaseAdminServiceAccount();
}

export function getApnsServerConfig(): ApnsServerConfig | null {
  return portState().getApnsServerConfig();
}

export function getNotificationGrantSecret(): string {
  return portState().getNotificationGrantSecret();
}
