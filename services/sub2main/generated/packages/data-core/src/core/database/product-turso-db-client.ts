import { nodeRequire } from '../node-require';
import "server-only";

import { AbstractDatabaseClient } from "./abstract-database-client";
import { getTursoProductRuntimeCredentials } from '../../ports/runtime-config';
import { drizzle } from "./drizzle-libsql.server";

let productTursoClient: any = null;

function getProductTursoClient(): any {
  if (productTursoClient) return productTursoClient;
  const { createClient } = nodeRequire("@libsql/client");
  productTursoClient = createClient(getTursoProductRuntimeCredentials());
  return productTursoClient;
}

export class ProductTursoDatabaseClient extends AbstractDatabaseClient {
  private _db: any = null;
  get db(): any {
    if (!this._db) {
      this._db = drizzle(getProductTursoClient());
    }
    return this._db;
  }
  async rawExecute(sql: string, params: any[] = []): Promise<any[]> {
    const result = await getProductTursoClient().execute({ sql, args: params });
    return result.rows as any[];
  }
}
