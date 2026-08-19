/**
 * Stub for `better-sqlite3`.
 *
 * This deployment is Turso-only; the local-SQLite branch in shared data-access
 * code is unreachable here.
 */
module.exports = function BetterSqlite3Unavailable() {
  throw new Error(
    'better-sqlite3 is not available in the submain service: this deployment is Turso-only.',
  );
};
module.exports.default = module.exports;
