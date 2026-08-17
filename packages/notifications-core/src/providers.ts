/**
 * `@asol/notifications-core/providers` — the credential-initialising providers.
 *
 * APNs and Web Push read their credentials **at module load**: the web-push provider calls
 * `setVapidDetails` as a side effect of being imported, and throws
 * "Vapid private key should be 32 bytes long" when the key is absent or wrong.
 *
 * That is why they are not on `./server`. Re-exporting them there made merely importing
 * that door require a valid VAPID pair, which broke every test that touched it — the door
 * became unopenable without production secrets.
 *
 * Import this door **lazily**, after the environment is set:
 *
 * ```ts
 * const { WebPushNotificationProvider } = await import('@asol/notifications-core/providers');
 * ```
 *
 * Normal delivery never needs it: the registry on `./server` selects a provider per
 * device and reaches these only when a send actually requires one.
 */
export * from './services/providers/apns-notification-provider.server';
export * from './services/providers/web-push-notification-provider.server';
