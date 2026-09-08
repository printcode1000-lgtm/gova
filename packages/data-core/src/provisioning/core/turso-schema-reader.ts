import type {
  ColumnInfo,
  DatabaseSchema,
  ForeignKeySchema,
  IndexSchema,
  TableSchema,
  TriggerSchema,
  ViewSchema,
} from './types';

/**
 * Reads a live Turso/libSQL database into the same neutral model the desired
 * manifests are written in. Read-only: it issues `SELECT` and `PRAGMA` and
 * nothing else, so it is safe to run against production while verifying.
 *
 * It reads more than `sqlite_master` on purpose. An inline `UNIQUE` constraint,
 * a composite primary key's column order, and a partial index's predicate are
 * either absent from the stored DDL or unusable as a string comparison — the
 * pragmas are where those facts are exact. A parity check that reads only the
 * CREATE text reports drift for a re-quoted column and stays silent about a
 * missing uniqueness guarantee.
 */

interface SqliteMasterRow {
  type: string;
  name: string;
  tbl_name: string;
  sql: string | null;
}

type LibsqlClient = {
  execute: (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function normalizeSql(sql: string | null | undefined): string {
  return (sql ?? '').replace(/\s+/g, ' ').trim();
}

async function pragma(
  client: LibsqlClient,
  statement: string,
): Promise<Record<string, unknown>[]> {
  const result = await client.execute({ sql: statement });
  return result.rows;
}

async function readColumns(client: LibsqlClient, tableName: string): Promise<ColumnInfo[]> {
  const rows = await pragma(client, `PRAGMA table_info(${quoteIdent(tableName)})`);
  return rows.map((row) => ({
    name: String(row.name),
    type: String(row.type || 'TEXT'),
    notNull: Number(row.notnull) === 1,
    defaultValue: row.dflt_value == null ? null : String(row.dflt_value),
    primaryKeyPosition: Number(row.pk ?? 0),
  }));
}

async function readForeignKeys(
  client: LibsqlClient,
  tableName: string,
): Promise<ForeignKeySchema[]> {
  const rows = await pragma(client, `PRAGMA foreign_key_list(${quoteIdent(tableName)})`);
  const byId = new Map<number, ForeignKeySchema>();
  for (const row of rows) {
    const id = Number(row.id);
    const entry = byId.get(id) ?? {
      columns: [],
      referencesTable: String(row.table),
      referencesColumns: [],
      onUpdate: String(row.on_update || 'NO ACTION'),
      onDelete: String(row.on_delete || 'NO ACTION'),
    };
    const seq = Number(row.seq);
    entry.columns[seq] = String(row.from);
    if (row.to != null) entry.referencesColumns[seq] = String(row.to);
    byId.set(id, entry);
  }
  return [...byId.values()]
    .map((entry) => ({
      ...entry,
      columns: entry.columns.filter(Boolean),
      referencesColumns: entry.referencesColumns.filter(Boolean),
    }))
    .sort((left, right) => left.columns.join().localeCompare(right.columns.join()));
}

/** Key columns of one index, in key order. `PRAGMA index_xinfo` also lists the
 *  rowid/payload columns, which are not part of the index's identity. */
async function readIndexColumns(client: LibsqlClient, indexName: string): Promise<string[]> {
  const rows = await pragma(client, `PRAGMA index_xinfo(${quoteIdent(indexName)})`);
  return rows
    .filter((row) => Number(row.key) === 1 && Number(row.cid) >= 0 && row.name != null)
    .sort((left, right) => Number(left.seqno) - Number(right.seqno))
    .map((row) => String(row.name));
}

function extractChecks(createSql: string): string[] {
  const sql = normalizeSql(createSql);
  const checks: string[] = [];
  const pattern = /\bCHECK\s*\(/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    let depth = 1;
    let index = match.index + match[0].length;
    while (index < sql.length && depth > 0) {
      const char = sql[index];
      if (char === '(') depth += 1;
      else if (char === ')') depth -= 1;
      index += 1;
    }
    checks.push(sql.slice(match.index + match[0].length, index - 1).replace(/\s+/g, ' ').trim());
  }
  return checks.sort();
}

function partialWhereOf(sql: string): string | null {
  const match = /\bWHERE\b([\s\S]+)$/i.exec(sql);
  return match ? match[1].replace(/\s+/g, ' ').trim() : null;
}

export async function readTursoSchema(
  client: LibsqlClient,
  source = 'turso',
): Promise<DatabaseSchema> {
  const masterResult = await client.execute({
    sql: `
    SELECT type, name, tbl_name, sql FROM sqlite_master
    WHERE name NOT LIKE 'sqlite_%'
    AND type IN ('table', 'index', 'view', 'trigger')
  `,
  });

  const masterRows = masterResult.rows as unknown as SqliteMasterRow[];
  const tables: Record<string, TableSchema> = {};
  const indexes: Record<string, IndexSchema> = {};
  const views: Record<string, ViewSchema> = {};
  const triggers: Record<string, TriggerSchema> = {};

  for (const row of masterRows) {
    if (row.type !== 'table' || !row.sql) continue;
    const createSql = normalizeSql(row.sql);
    const indexList = await pragma(client, `PRAGMA index_list(${quoteIdent(row.name)})`);
    const uniqueConstraints: string[][] = [];
    for (const index of indexList) {
      if (Number(index.unique) !== 1 || String(index.origin) !== 'u') continue;
      const columns = await readIndexColumns(client, String(index.name));
      if (columns.length > 0) uniqueConstraints.push(columns);
    }
    tables[row.name] = {
      name: row.name,
      createSql,
      columns: await readColumns(client, row.name),
      foreignKeys: await readForeignKeys(client, row.name),
      constraints: {
        checks: extractChecks(createSql),
        autoIncrement: /\bAUTOINCREMENT\b/i.test(createSql),
        uniqueConstraints: uniqueConstraints.sort((left, right) =>
          left.join().localeCompare(right.join()),
        ),
      },
    };
  }

  for (const row of masterRows) {
    if (row.type === 'index') {
      // An auto-index backing a UNIQUE/PRIMARY KEY constraint has no DDL of its
      // own; it is already represented on its table's constraints.
      if (!row.sql) continue;
      indexes[row.name] = {
        name: row.name,
        tableName: row.tbl_name,
        sql: normalizeSql(row.sql),
        unique: /\bCREATE\s+UNIQUE\s+INDEX\b/i.test(row.sql),
        columns: await readIndexColumns(client, row.name),
        where: partialWhereOf(row.sql),
      };
    } else if (row.type === 'view' && row.sql) {
      views[row.name] = { name: row.name, sql: normalizeSql(row.sql) };
    } else if (row.type === 'trigger' && row.sql) {
      triggers[row.name] = { name: row.name, sql: normalizeSql(row.sql) };
    }
  }

  return { source, tables, indexes, views, triggers };
}
