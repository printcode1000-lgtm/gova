import "server-only";

import type { IDatabaseClient } from "./database/database-client.interface";
import { assertServerDataAccessRuntime } from "./database/environment";
import { TursoDatabaseClient } from "./database/turso-db-client";
import { ProductTursoDatabaseClient } from "./database/product-turso-db-client";
import { AdvertisementsTursoDatabaseClient } from "./database/advertisements-turso-db-client";
import { ProfileShardedDatabaseClient } from "./database/profile-sharded-db-client";
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
 * It owns lazy connection creation and nothing else. Repositories ask for a
 * logical source; they never choose a database or a shard directly.
 *
 * There is no backend left to select. Every source is Turso/libSQL in every
 * runtime that may reach a database at all — Development included — so a
 * developer's request and a user's request cannot answer from different stores.
 * Missing credentials fail loudly at the owning client rather than resolving to
 * an emptier source.
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
    assertServerDataAccessRuntime();
    switch (name) {
      case "users":
        return new TursoDatabaseClient();
      case "products":
        return new ProductTursoDatabaseClient();
      case "advertisements":
        return new AdvertisementsTursoDatabaseClient();
      case "profiles":
        return new ProfileShardedDatabaseClient();
      case "notifications":
        return new NotificationsTursoDatabaseClient();
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
