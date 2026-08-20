import 'server-only';

/**
 * Static door for the Turso drizzle adapter.
 *
 * Turso clients used `nodeRequire('drizzle-orm/libsql')` so SQLite deployments never
 * loaded the libsql driver. On Vercel, `serverExternalPackages` keeps `drizzle-orm`
 * external but file tracing does not copy lazy-required subpaths, so production threw
 * `Cannot find module 'drizzle-orm/libsql/index.cjs'`. A static import lets Next trace
 * and ship the adapter with every server route that reaches the data registry.
 */
export { drizzle } from 'drizzle-orm/libsql';
