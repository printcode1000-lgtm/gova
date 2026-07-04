import "server-only";
export function getMarketplaceDatabaseConfig(){return {isProduction:process.env.NODE_ENV==="production",sqlitePath:process.env.MARKETPLACE_ORDERS_SQLITE_PATH,databaseUrl:process.env.MARKETPLACE_ORDERS_DATABASE_URL,authToken:process.env.MARKETPLACE_ORDERS_DATABASE_AUTH_TOKEN}}
