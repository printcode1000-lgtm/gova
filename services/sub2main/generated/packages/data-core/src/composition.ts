import "server-only";

/**
 * The composition door: one shard, for one composition root.
 *
 * `./core` used to be public and exported the data-source registry — the object
 * whose `get(name)` returns any database — alongside all six raw sources.
 * Nothing outside the package used the registry, and nothing used five of the
 * sources. That is not the measure of a public door: it is the answer a
 * developer finds when they search for a way to write a row, and it handed over
 * every database in one import, through a declared door that every architecture
 * check accepts.
 *
 * Exactly one composition root needs a shard directly:
 * `src/core/config/system-logs.server.ts` wires `@asol/system-logs-core`'s
 * `database: { execute }` port to the profiles source. That is what this door
 * carries.
 *
 * Repositories reach the registry through relative paths *inside* the package,
 * where it belongs. Those imports are deliberately untouched — rewriting them
 * changes which module instance a bundler hands back, and this package's port
 * state is per instance.
 *
 * Adding another shard here means naming it. Never the registry.
 */
export { profilesDataSource } from "./core/data-source-registry";
export type { IDatabaseClient } from "./core/database/database-client.interface";
