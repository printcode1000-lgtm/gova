import type { RegisteredNotificationToken } from '../domain/entities';

/**
 * Token store port — the three persistence operations delivery needs.
 *
 * Delivery used to construct `@asol/data-core/notifications` queries directly,
 * which closed a cycle: data-core imports this package's domain types for the
 * rows it persists, and this package imported data-core to read them back. Two
 * packages that cannot be reasoned about, extracted, or tested apart.
 *
 * The direction that survives is data-core → notifications-core, because the
 * domain types belong to the capability and the tables merely store them. So
 * delivery names the surface it needs and the composition root supplies
 * data-core's implementation.
 *
 * Deliberately three methods. A port wide enough to mirror the repository would
 * only move the coupling behind an interface.
 */
export interface NotificationTokenStorePort {
  /** Registered tokens for each uid, keyed by uid. */
  tokensByUid(uids: string[]): Promise<Record<string, RegisteredNotificationToken[]>>;
  /** The subset of uids whose account has push enabled. */
  pushEnabledUids(uids: string[]): Promise<string[]>;
  /** Drop a registration the provider reported as invalid. */
  deleteToken(input: { uid: string; tokenId: string }): Promise<unknown>;
}

const UNCONFIGURED: NotificationTokenStorePort = {
  tokensByUid: () => {
    throw new Error('notificationsCorePort: token store is not configured');
  },
  pushEnabledUids: () => {
    throw new Error('notificationsCorePort: token store is not configured');
  },
  deleteToken: () => {
    throw new Error('notificationsCorePort: token store is not configured');
  },
};

let store: NotificationTokenStorePort = UNCONFIGURED;

export function configureNotificationTokenStore(
  next: NotificationTokenStorePort,
): void {
  store = next;
}

export function resetNotificationTokenStore(): void {
  store = UNCONFIGURED;
}

/**
 * Resolved per call, never at module load: reading the port while the module
 * evaluates would put import order back into the contract.
 */
export function notificationTokenStore(): NotificationTokenStorePort {
  return store;
}
