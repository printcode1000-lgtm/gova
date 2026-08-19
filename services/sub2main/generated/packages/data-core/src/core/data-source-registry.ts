import "server-only";

import type { IDatabaseClient } from "./database/database-client.interface";
import { getServerDatabaseBackend } from "./database/environment";
// Adapters are imported statically. A relative `nodeRequire()` cannot work here: this
// package ships TypeScript sources, and `createRequire` is a real Node resolution at
// runtime, which has no extension to resolve `./database/<client>` against — every data
// source failed with "Cannot find module". Importing the classes costs nothing at load
// time: each adapter still pulls its driver (`better-sqlite3`, `@libsql/client`, drizzle)
// lazily through `nodeRequire` inside the branch that needs it, so a Turso deployment
// never loads the SQLite driver and a SQLite run never opens a libSQL connection.
import { SQLiteDatabaseClient } from "./database/sqlite-db-client";
import { TursoDatabaseClient } from "./database/turso-db-client";
import { ProductSQLiteDatabaseClient } from "./database/product-sqlite-db-client";
import { ProductTursoDatabaseClient } from "./database/product-turso-db-client";
import { AdvertisementsSQLiteDatabaseClient } from "./database/advertisements-sqlite-db-client";
import { AdvertisementsTursoDatabaseClient } from "./database/advertisements-turso-db-client";
import { ProfileShardedDatabaseClient } from "./database/profile-sharded-db-client";
import { NotificationsSQLiteDatabaseClient } from "./database/notifications-sqlite-db-client";
import { NotificationsTursoDatabaseClient } from "./database/notifications-turso-db-client";

export type ServerDataSourceName =
  | "users"
  | "products"
  | "advertisements"
  | "profiles"
  | "notifications";

/**
 * The single runtime registry for server database sources.
 *
 * It owns environment routing and lazy connection creation. Repositories ask
 * for a logical source; they never choose SQLite, Turso, or a shard directly.
 */
class DataSourceRegistry {
  private readonly sources = new Map<ServerDataSourceName, IDatabaseClient>();

  get(name: ServerDataSourceName): IDatabaseClient {
    const existing = this.sources.get(name);
    if (existing) return existing;

    const source = this.create(name);
    this.sources.set(name, source);
    return source;
  }

  private create(name: ServerDataSourceName): IDatabaseClient {
    const backend = getServerDatabaseBackend();
    switch (name) {
      case "users":
        return backend === "sqlite"
          ? new SQLiteDatabaseClient()
          : new TursoDatabaseClient();
      case "products":
        return backend === "sqlite"
          ? new ProductSQLiteDatabaseClient()
          : new ProductTursoDatabaseClient();
      case "advertisements":
        return backend === "sqlite"
          ? new AdvertisementsSQLiteDatabaseClient()
          : new AdvertisementsTursoDatabaseClient();
      case "profiles":
        return new ProfileShardedDatabaseClient();
      case "notifications":
        return backend === "sqlite"
          ? new NotificationsSQLiteDatabaseClient()
          : new NotificationsTursoDatabaseClient();
    }
  }
}

export const dataSources = new DataSourceRegistry();

function lazyDataSource(name: ServerDataSourceName): IDatabaseClient {
  return {
    get db() {
      return dataSources.get(name).db;
    },
    execute: (sql, params) => dataSources.get(name).execute(sql, params),
    insert: (table, data) => dataSources.get(name).insert(table, data),
    select: (table, where, limit) => dataSources.get(name).select(table, where, limit),
    update: (table, data, where) => dataSources.get(name).update(table, data, where),
    delete: (table, where) => dataSources.get(name).delete(table, where),
  };
}

export const usersDataSource = lazyDataSource("users");
export const productsDataSource = lazyDataSource("products");
export const advertisementsDataSource = lazyDataSource("advertisements");
export const profilesDataSource = lazyDataSource("profiles");
export const notificationsDataSource = lazyDataSource("notifications");
