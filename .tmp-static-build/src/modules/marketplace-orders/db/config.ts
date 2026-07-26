import "server-only";
import { isDevRuntime } from "@/core/config/runtime-env";

export function getMarketplaceDatabaseConfig() {
  return {
    isProduction: !isDevRuntime(),
    sqlitePath: process.env.MARKETPLACE_ORDERS_SQLITE_PATH,
    databaseUrl: process.env.MARKETPLACE_ORDERS_DATABASE_URL,
    authToken: process.env.MARKETPLACE_ORDERS_DATABASE_AUTH_TOKEN,
  };
}
