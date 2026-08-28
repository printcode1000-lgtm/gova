import "server-only";

/**
 * Run one prepared better-sqlite3 statement and always return rows for any
 * statement that produces them.
 *
 * Sniffing the SQL text ("does it start with SELECT?") misclassifies every
 * row-returning statement that is not a SELECT — `PRAGMA table_info(...)` in
 * particular. better-sqlite3 answers `run()` on such a statement with an empty
 * `{ changes, lastInsertRowid }` info object instead of the rows, so callers
 * silently read an empty result set. `Statement#reader` is the driver's own
 * answer to the same question and covers SELECT, PRAGMA, and RETURNING alike.
 */
export function executeSqliteStatement(
  statement: { reader: boolean; all: (...params: any[]) => any[]; run: (...params: any[]) => any },
  params: any[] = [],
): any[] {
  return statement.reader ? statement.all(...params) : [statement.run(...params)];
}
