import "server-only";

import { AbstractDatabaseClient } from "./abstract-database-client";
import { getTursoProductRuntimeCredentials } from "@/core/config/server-env";

let productTursoClient: any = null;

function getProductTursoClient(): any {
  if (productTursoClient) return productTursoClient;
  const { createClient } = require("@libsql/client");
  productTursoClient = createClient(getTursoProductRuntimeCredentials());
  return productTursoClient;
}

export class ProductTursoDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;
  get db(): any {
    if (!this._db) {
      const { drizzle } = require("drizzle-orm/libsql");
      this._db = drizzle(getProductTursoClient());
    }
    return this._db;
  }
  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const result = await getProductTursoClient().execute({ sql, args: params });
    return result.rows as any[];
  }
}
