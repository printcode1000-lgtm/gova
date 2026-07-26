import type { DatabaseSchema, ColumnInfo, IndexSchema, TableSchema, TriggerSchema, ViewSchema } from './types';

interface SqliteMasterRow {
  type: string;
  name: string;
  tbl_name: string;
  sql: string | null;
}

async function readColumns(
  client: { execute: (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
  tableName: string
): Promise<ColumnInfo[]> {
  const result = await client.execute({ sql: `PRAGMA table_info(${quoteIdent(tableName)})` });
  return result.rows.map((row) => ({
    name: String(row.name),
    type: String(row.type || 'TEXT'),
    notNull: Number(row.notnull) === 1,
    defaultValue: row.dflt_value == null ? null : String(row.dflt_value),
    primaryKey: Number(row.pk) === 1,
  }));
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export async function readTursoSchema(
  client: { execute: (...args: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> },
  source = 'turso'
): Promise<DatabaseSchema> {
  const masterResult = await client.execute({
    sql: `
    SELECT type, name, tbl_name, sql FROM sqlite_master
    WHERE sql IS NOT NULL
    AND name NOT LIKE 'sqlite_%'
    AND type IN ('table', 'index', 'view', 'trigger')
  `,
  });

  const masterRows = masterResult.rows as unknown as SqliteMasterRow[];
  const tables: Record<string, TableSchema> = {};
  const indexes: Record<string, IndexSchema> = {};
  const views: Record<string, ViewSchema> = {};
  const triggers: Record<string, TriggerSchema> = {};

  for (const row of masterRows) {
    if (row.type === 'table') {
      tables[row.name] = {
        name: row.name,
        createSql: row.sql ?? '',
        columns: await readColumns(client, row.name),
      };
    } else if (row.type === 'index') {
      indexes[row.name] = {
        name: row.name,
        tableName: row.tbl_name,
        sql: row.sql ?? '',
        unique: (row.sql ?? '').toUpperCase().includes('UNIQUE'),
      };
    } else if (row.type === 'view') {
      views[row.name] = { name: row.name, sql: row.sql ?? '' };
    } else if (row.type === 'trigger') {
      triggers[row.name] = { name: row.name, sql: row.sql ?? '' };
    }
  }

  return { source, tables, indexes, views, triggers };
}
