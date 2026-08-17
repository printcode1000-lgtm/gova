/** Canonical SQLite filenames for local development databases. */

export const PRIMARY_SQLITE_FILE = "allusers.db" as const;

export const PROFILE_SOURCE_SQLITE_FILE = "profile.db" as const;

export const PRODUCT_SQLITE_FILE = "product.db" as const;

export const ADVERTISEMENTS_SQLITE_FILE = "advertisements.db" as const;

export const NOTIFICATIONS_SQLITE_FILE = "notifications.db" as const;

export const MARKETPLACE_ORDERS_SOURCE_SQLITE_FILE = "marketplace-orders.db" as const;

export const LOCAL_RUNTIME_SQLITE_FILES = {
  primary: PRIMARY_SQLITE_FILE,
  profileSource: PROFILE_SOURCE_SQLITE_FILE,
  product: PRODUCT_SQLITE_FILE,
  advertisements: ADVERTISEMENTS_SQLITE_FILE,
  notifications: NOTIFICATIONS_SQLITE_FILE,
  marketplaceOrdersSource: MARKETPLACE_ORDERS_SOURCE_SQLITE_FILE,
} as const;
