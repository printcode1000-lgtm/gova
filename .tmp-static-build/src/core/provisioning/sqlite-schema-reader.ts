import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { getPrimarySqliteDbPath, getSqliteDbPaths } from '@/core/database/environment.server';
import type {
  ColumnInfo,
  DatabaseSchema,
  IndexSchema,
  TableSchema,
  TriggerSchema,
  ViewSchema,
} from './types';

interface SqliteMasterRow {
  type: string;
  name: string;
  tbl_name: string;
  sql: string | null;
}

function readColumns(db: Database.Database, tableName: string): ColumnInfo[] {
  const rows = db.pragma(`table_info(${tableName})`) as Array<{
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }>;

  return rows.map((row) => ({
    name: row.name,
    type: row.type || 'TEXT',
    notNull: row.notnull === 1,
    defaultValue: row.dflt_value,
    primaryKey: row.pk === 1,
  }));
}

function readSchemaFromFile(dbPath: string): DatabaseSchema {
  const db = new Database(dbPath, { readonly: true });

  try {
    const masterRows = db
      .prepare(
        `SELECT type, name, tbl_name, sql FROM sqlite_master
         WHERE sql IS NOT NULL
         AND name NOT LIKE 'sqlite_%'
         AND type IN ('table', 'index', 'view', 'trigger')`
      )
      .all() as SqliteMasterRow[];

    const tables: Record<string, TableSchema> = {};
    const indexes: Record<string, IndexSchema> = {};
    const views: Record<string, ViewSchema> = {};
    const triggers: Record<string, TriggerSchema> = {};

    for (const row of masterRows) {
      if (row.type === 'table') {
        tables[row.name] = {
          name: row.name,
          createSql: row.sql ?? '',
          columns: readColumns(db, row.name),
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

    return {
      source: dbPath,
      tables,
      indexes,
      views,
      triggers,
    };
  } finally {
    db.close();
  }
}

/**
 * Reads the schema from a single SQLite file, or merges all .db files when no path is given.
 * Schema sync uses one file per Turso database — do not merge for production sync.
 */
export function readSqliteSchema(dbPath?: string): DatabaseSchema {
  const paths = dbPath ? [dbPath] : getSqliteDbPaths();

  if (paths.length === 0) {
    const fallback = getPrimarySqliteDbPath();
    if (!existsSync(fallback)) {
      throw new Error(
        `SQLite schema source not found. Expected database files in public/sync_data/sync_sqlite/`
      );
    }
    return readSchemaFromFile(fallback);
  }

  const merged: DatabaseSchema = {
    source: paths.join(', '),
    tables: {},
    indexes: {},
    views: {},
    triggers: {},
  };

  for (const filePath of paths) {
    if (!existsSync(filePath)) continue;
    const schema = readSchemaFromFile(filePath);

    Object.assign(merged.tables, schema.tables);
    Object.assign(merged.indexes, schema.indexes);
    Object.assign(merged.views, schema.views);
    Object.assign(merged.triggers, schema.triggers);
  }

  return merged;
}
