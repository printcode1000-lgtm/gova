import "server-only";

import type { IDatabaseClient } from "./database-client.interface";
import { isDevRuntime } from "./environment";

/**
 * AdvertisementsDbClient — server-only driver selector for the advertisements database.
 *
 * Development runtime  → SQLite (public/sync_data/sync_sqlite/advertisements.db)
 * Production runtime   → Turso (@libsql/client)
 *
 * Reads TURSO_ADVERTISEMENTS_DATABASE_URL / TURSO_ADVERTISEMENTS_AUTH_TOKEN when set,
 * otherwise falls back to the main TURSO_DATABASE_URL / TURSO_AUTH_TOKEN pair so that
 * simple single-database deployments work without extra environment variables.
 */
function createAdvertisementsDbClient(): IDatabaseClient {
  if (isDevRuntime()) {
    const {
      AdvertisementsSQLiteDatabaseClient,
    } = require("./advertisements-sqlite-db-client");
    return new AdvertisementsSQLiteDatabaseClient();
  }
  const {
    AdvertisementsTursoDatabaseClient,
  } = require("./advertisements-turso-db-client");
  return new AdvertisementsTursoDatabaseClient();
}

// Dedicated advertisements database. Turso replaces SQLite in production.
export const advertisementsDbClient: IDatabaseClient =
  createAdvertisementsDbClient();

