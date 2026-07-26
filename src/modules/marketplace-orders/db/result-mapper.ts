export const isReadQuery = (sql: string) => /^\s*(SELECT|WITH|PRAGMA)/i.test(sql);

export const rowsOrChanges = (
  sql: string,
  result: { rows: unknown[]; rowsAffected: number },
): Record<string, unknown>[] =>
  isReadQuery(sql)
    ? (result.rows as Record<string, unknown>[])
    : result.rows.length > 0
      ? (result.rows as Record<string, unknown>[])
      : [{ changes: result.rowsAffected }];
