import "server-only";

import type { IDatabaseClient } from "./database-client.interface";
import { isDevRuntime } from "./environment";

export class ProductDatabaseClient implements IDatabaseClient {
  private activeClient: IDatabaseClient;
  constructor() {
    this.activeClient = isDevRuntime()
      ? new (require("./product-sqlite-db-client").ProductSQLiteDatabaseClient)()
      : new (require("./product-turso-db-client").ProductTursoDatabaseClient)();
  }
  get db() {
    return this.activeClient.db;
  }
  execute(sql: string, params?: any[]) {
    return this.activeClient.execute(sql, params);
  }
  insert(table: string, data: Record<string, any>) {
    return this.activeClient.insert(table, data);
  }
  select(table: string, where: Record<string, any>, limit?: number) {
    return this.activeClient.select(table, where, limit);
  }
  update(table: string, data: Record<string, any>, where: Record<string, any>) {
    return this.activeClient.update(table, data, where);
  }
  delete(table: string, where: Record<string, any>) {
    return this.activeClient.delete(table, where);
  }
}

export const productDbClient: IDatabaseClient = new ProductDatabaseClient();
