/**
 * `@asol/notifications-core` — the browser-safe half.
 *
 * Notification domain: what a notification is, how one is built, how a template is
 * resolved, and the contracts both halves agree on. Nothing here may reach a node
 * builtin, a provider SDK, or a credential — the application's UI imports this door and
 * ships it to the device.
 *
 * Construction objects live behind `./builder`, delivery behind `./server`. The split is the same one `ota-core` and
 * `storage-core` make, and for the same reason: a single door would bundle the FCM, APNs
 * and web-push code into the client bundle.
 *
 * **Android channel creation is not here.** It belongs to `@asol/native-core`, which owns
 * every Capacitor surface — `ensureNotificationChannels`, `registerForPushNotifications`,
 * and the channel constants. Rule 9: upgrading a Capacitor plugin must touch one package,
 * and that package is `native-core`.
 */
export * from './contracts';
export * from './domain/entities';
export * from './domain/enums';
export * from './domain/defaults';
export * from './domain/create-notification-id';
export * from './domain/notification-sound';
export * from './domain/notification-test-scenarios';
export * from './domain/web-push-config';

// Type-only, and on the browser door on purpose. A consumer that needs the provider
// vocabulary must not have to open './server' to get it: that door reaches the registry,
// which constructs every provider at module load — including web-push, which demands a
// valid VAPID pair the moment it is imported.
export type * from './services/providers/notification-provider.interface';
