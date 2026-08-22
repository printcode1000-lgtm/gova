import 'server-only';

/**
 * `@asol/notifications-core/server` — the delivery half.
 *
 * Push fan-out and the grant protocol: FCM HTTP v1, APNs, Web Push, provider selection,
 * and grant verification. This is what the `asol-notifications` Vercel account runs, and
 * it is the only notification path that deployment may reach.
 *
 * Kept apart from the `.` door because these modules pull `google-auth-library`, node
 * crypto and the provider SDKs. A single door would bundle all of it into the client.
 */
export * from './service-runtime';
export * from './services/notification-send-service.server';
export * from './services/notification-grant.server';
export * from './services/providers/notification-provider.interface';
export * from './services/providers/notification-provider-registry.server';

/**
 * Two providers, named individually because the contract tests construct them directly —
 * proving a data-only FCM payload never becomes a visible notification is a claim you
 * cannot check through the registry without also depending on how it chooses.
 *
 * **APNs and Web Push are deliberately absent.** The web-push provider calls
 * `setVapidDetails` at module load, so re-exporting it here made merely *importing this
 * door* demand a valid VAPID key pair — every test that touched the door started failing
 * with "Vapid private key should be 32 bytes long". They stay behind the registry, which
 * reaches them only when a delivery actually needs one.
 */
export * from './services/providers/fcm-notification-provider.server';
export * from './services/providers/fcm-http-v1.server';
export * from './services/providers/noop-notification-provider.server';

export {
  configureNotificationsCoreServerConfig,
  resetNotificationsCoreServerConfig,
} from './ports/server-config';
export {
  configureNotificationTokenStore,
  resetNotificationTokenStore,
  type NotificationTokenStorePort,
} from './ports/token-store';
