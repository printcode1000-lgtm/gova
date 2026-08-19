/**
 * `@asol/data-core` — the root door.
 *
 * Browser-safe by construction: it carries the module identity and the runtime policy
 * that decides which database driver a given environment is allowed to reach. Every
 * capability that needs a driver, a schema, or a credential lives behind another door,
 * and `src/core/database` has no door at all — nothing outside this package can import
 * drizzle, `@libsql/client`, or `better-sqlite3`, because no export path leads there.
 */
export const DATA_CORE_MODULE = "data-core" as const;

export {
  resolveServerDatabaseBackend,
  type ServerDatabaseBackend,
} from "./core/database-runtime-policy";
