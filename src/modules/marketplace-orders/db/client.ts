import "server-only";
import { ShardedMarketplaceOrdersDb } from "./sharded-client";

export interface MarketplaceDb { execute(sql:string,params?:unknown[]):Promise<Record<string,unknown>[]>; transaction<T>(work:(db:MarketplaceDb)=>Promise<T>):Promise<T> }

export function createMarketplaceOrdersDb():MarketplaceDb {
  return new ShardedMarketplaceOrdersDb();
}
