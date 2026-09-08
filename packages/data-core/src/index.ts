/**
 * `@asol/data-core` — the root door.
 *
 * Browser-safe by construction: it carries the module identity and the runtime policy
 * that decides whether a given environment may reach a server database at all. Every
 * capability that needs a driver, a schema, or a credential lives behind another door,
 * and `src/core/database` has no door at all — nothing outside this package can import
 * drizzle or `@libsql/client`, because no export path leads there.
 *
 * The policy answers whether, never which. Server application data is Turso/libSQL in
 * every runtime that may reach a database, so there is no backend left to select.
 */
export const DATA_CORE_MODULE = "data-core" as const;

export {
  assertServerDatabaseRuntime,
  type DatabaseRuntimeContext,
} from "./core/database-runtime-policy";
