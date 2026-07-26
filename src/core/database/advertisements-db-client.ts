import "server-only";

import type { IDatabaseClient } from "./database-client.interface";
import { isDevRuntime } from "./environment";

/**
 * AdvertisementsDbClient — server-only driver selector for the advertisements database.
 *
 * Development runtime  → SQLite (public/sync_data/sync_sqlite/advertisements.db)
 * Production runtime   → Turso (@libsql/client)
 *
 * Reads TURSO_ADVERTISEMENTS_DATABASE_URL / TURSO_ADVERTISEMENTS_AUTH_TOKEN.
 * Advertisements use a dedicated Turso database so its cloud schema can stay
 * exactly aligned with public/sync_data/sync_sqlite/advertisements.db.
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
