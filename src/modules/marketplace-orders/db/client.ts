import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getMarketplaceDatabaseConfig } from "./config";
export interface MarketplaceDb { execute(sql:string,params?:unknown[]):Promise<Record<string,unknown>[]>; transaction<T>(work:(db:MarketplaceDb)=>Promise<T>):Promise<T> }
const normalize=(values:unknown[])=>values.map(value=>typeof value==="boolean"?(value?1:0):value);
export function createMarketplaceOrdersDb():MarketplaceDb {
  const config=getMarketplaceDatabaseConfig();
  if(!config.isProduction){
    const Database=require("better-sqlite3");
    const dbPath=config.sqlitePath||path.join(process.cwd(),"public/sync_data/sync_sqlite/marketplace_orders.db");
    fs.mkdirSync(path.dirname(dbPath),{recursive:true}); const sqlite=new Database(dbPath); sqlite.pragma("foreign_keys = ON"); sqlite.exec(fs.readFileSync(path.join(process.cwd(),"src/modules/marketplace-orders/db/migrations/0000_marketplace_orders.sql"),"utf8"));
    const api:MarketplaceDb={async execute(sql,params=[]){const s=sqlite.prepare(sql),args=normalize(params);return /^\s*(SELECT|WITH|PRAGMA)/i.test(sql)?s.all(...args):[{changes:s.run(...args).changes}]},async transaction(work){sqlite.exec("BEGIN IMMEDIATE");try{const result=await work(api);sqlite.exec("COMMIT");return result}catch(error){sqlite.exec("ROLLBACK");throw error}}}; return api;
  }
  const url=config.databaseUrl,authToken=config.authToken;if(!url)throw new Error("MARKETPLACE_ORDERS_DATABASE_URL is required in production");const client=require("@libsql/client").createClient({url,authToken});
  const api:MarketplaceDb={async execute(sql,params=[]){const r=await client.execute({sql,args:normalize(params)});return r.rows as Record<string,unknown>[]},async transaction(work){const tx=await client.transaction("write");const scoped:MarketplaceDb={execute:async(sql,params=[])=>{const r=await tx.execute({sql,args:normalize(params)});return r.rows as Record<string,unknown>[]},transaction:async fn=>fn(scoped)};try{const result=await work(scoped);await tx.commit();return result}catch(error){await tx.rollback();throw error}}};return api;
}
