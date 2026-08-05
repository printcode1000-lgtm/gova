/**
 * Stub for `better-sqlite3`.
 *
 * The shared data-access code keeps a local-SQLite branch for main-app
 * development. This deployment always runs against Turso — `getServerDatabaseBackend()`
 * can never return `sqlite` here — so the driver is unreachable, and bundling
 * the real native module would force a native build for code that cannot run.
 *
 * Constructing it throws rather than returning a fake database, so a routing
 * mistake surfaces immediately instead of silently reading an empty file.
 */
module.exports = function BetterSqlite3Unavailable() {
  throw new Error(
    'better-sqlite3 is not available in the notifications service: this deployment is Turso-only.',
  );
};
module.exports.default = module.exports;
