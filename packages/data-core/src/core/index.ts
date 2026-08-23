/**
 * The `@asol/data-core/core` door — deliberately one data source, not the registry.
 *
 * This door used to export the registry itself — the object whose `get(name)`
 * returns any shard — alongside all six raw sources. Nothing outside the package used
 * five of them, and nothing used the registry at all — but a public door is not
 * measured by who calls it today. It is the answer a future developer finds
 * when they search the repository for a way to write a row, and the registry
 * hands over every database in one import, through a declared door that every
 * architecture check accepts.
 *
 * What remains is what one composition root genuinely needs:
 * `src/core/config/system-logs.server.ts` wires `@asol/system-logs-core`'s
 * `database: { execute }` port to the profiles shard. That package receives one
 * method; this door should not offer more than the wiring requires.
 *
 * Repositories reach their own sources through the registry *inside* the
 * package, where it belongs. If another composition root needs a shard, add it
 * here by name — never the registry.
 */
export { profilesDataSource } from "./data-source-registry";
export type { IDatabaseClient } from "./database/database-client.interface";
