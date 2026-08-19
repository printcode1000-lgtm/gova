import { nodeRequire } from './node-require';
import "server-only";

import type { IDatabaseClient } from "./database/database-client.interface";
import { getServerDatabaseBackend } from "./database/environment";

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
          ? new (nodeRequire("./database/sqlite-db-client").SQLiteDatabaseClient)()
          : new (nodeRequire("./database/turso-db-client").TursoDatabaseClient)();
      case "products":
        return backend === "sqlite"
          ? new (nodeRequire("./database/product-sqlite-db-client").ProductSQLiteDatabaseClient)()
          : new (nodeRequire("./database/product-turso-db-client").ProductTursoDatabaseClient)();
      case "advertisements":
        return backend === "sqlite"
          ? new (nodeRequire("./database/advertisements-sqlite-db-client").AdvertisementsSQLiteDatabaseClient)()
          : new (nodeRequire("./database/advertisements-turso-db-client").AdvertisementsTursoDatabaseClient)();
      case "profiles":
        return new (nodeRequire("./database/profile-sharded-db-client").ProfileShardedDatabaseClient)();
      case "notifications":
        return backend === "sqlite"
          ? new (nodeRequire("./database/notifications-sqlite-db-client").NotificationsSQLiteDatabaseClient)()
          : new (nodeRequire("./database/notifications-turso-db-client").NotificationsTursoDatabaseClient)();
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
