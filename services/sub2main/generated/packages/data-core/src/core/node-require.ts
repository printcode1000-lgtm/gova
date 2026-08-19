import { createRequire } from 'node:module';

/**
 * A synchronous `require` for the driver layer.
 *
 * The database clients load `better-sqlite3`, `@libsql/client`, and the drizzle adapters
 * **lazily and synchronously**, inside the branch that actually needs them: a Turso deployment
 * must never pull `better-sqlite3` into its bundle, and a SQLite run must never open a libSQL
 * connection. `await import()` would work only by making every constructor async and every
 * caller await it, which is a change to the whole data path for no benefit.
 *
 * `require` is not defined in an ES module, and this package declares `"type": "module"`. The
 * same code ran as CommonJS before it moved out of `src/`, and this is what keeps it running
 * unchanged: `createRequire` gives back exactly the CommonJS resolver those branches expect.
 *
 * Server-only by construction — nothing behind the `./browser` door may reach this file, and
 * the contract test fails if it ever does.
 */
export const nodeRequire = createRequire(import.meta.url);
