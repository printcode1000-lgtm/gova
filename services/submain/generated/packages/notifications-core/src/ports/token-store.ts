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
const STORE_KEY = Symbol.for('@asol/notifications-core/token-store');

interface NotificationTokenStorePortCarrier {
  [STORE_KEY]?: NotificationTokenStorePort;
}

const storeDefaults = (): NotificationTokenStorePort => (UNCONFIGURED);

function storeState(): NotificationTokenStorePort {
  const carrier = globalThis as NotificationTokenStorePortCarrier;
  carrier[STORE_KEY] ??= storeDefaults();
  return carrier[STORE_KEY]!;
}

function setStoreState(next: NotificationTokenStorePort): void {
  (globalThis as NotificationTokenStorePortCarrier)[STORE_KEY] = next;
}

export function configureNotificationTokenStore(
  next: NotificationTokenStorePort,
): void {
  setStoreState(next);
}

export function resetNotificationTokenStore(): void {
  setStoreState(UNCONFIGURED);
}

/**
 * Resolved per call, never at module load: reading the port while the module
 * evaluates would put import order back into the contract.
 */
export function notificationTokenStore(): NotificationTokenStorePort {
  return storeState();
}
