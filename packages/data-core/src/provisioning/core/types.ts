/**
 * The neutral schema model provisioning compares in both directions.
 *
 * One `DatabaseSchema` describes exactly one logical Turso database. The same
 * shape is produced by a repository-owned desired manifest and by reading a live
 * Turso database back, which is what lets the diff be a comparison rather than a
 * translation.
 *
 * It models what a difference can be *repaired* by, not only what a difference
 * looks like. A primary key carries its ordinal so a composite key compares
 * exactly; foreign keys, CHECK constraints, `AUTOINCREMENT` and inline UNIQUE
 * are named separately from the CREATE text because raw SQL equality is fragile
 * — an added column arrives quoted differently from the original statement, and
 * a diff that reads only the text reports drift that is not there while missing
 * a constraint that genuinely differs.
 */

export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  /**
   * 1-based position within the primary key; `0` when the column is not part of
   * it. A boolean cannot distinguish `PRIMARY KEY (a, b)` from `(b, a)`, and the
   * two are different tables.
   */
  primaryKeyPosition: number;
}

export interface ForeignKeySchema {
  columns: string[];
  referencesTable: string;
  referencesColumns: string[];
  onUpdate: string;
  onDelete: string;
}

export interface TableConstraints {
  /** Normalized CHECK expressions declared on the table. */
  checks: string[];
  /** `INTEGER PRIMARY KEY AUTOINCREMENT` — a rowid allocation guarantee, not decoration. */
  autoIncrement: boolean;
  /**
   * Column tuples made unique by a table constraint rather than a named index.
   * SQLite backs these with an auto-index whose `sqlite_master.sql` is null, so
   * they are invisible to any check that reads only index DDL.
   */
  uniqueConstraints: string[][];
}

export interface TableSchema {
  name: string;
  createSql: string;
  columns: ColumnInfo[];
  foreignKeys: ForeignKeySchema[];
  constraints: TableConstraints;
}

export interface IndexSchema {
  name: string;
  tableName: string;
  sql: string;
  unique: boolean;
  columns: string[];
  /** `WHERE` predicate of a partial index; `null` for a full index. */
  where: string | null;
}

export interface ViewSchema {
  name: string;
  sql: string;
}

export interface TriggerSchema {
  name: string;
  sql: string;
}

export interface DatabaseSchema {
  source: string;
  tables: Record<string, TableSchema>;
  indexes: Record<string, IndexSchema>;
  views: Record<string, ViewSchema>;
  triggers: Record<string, TriggerSchema>;
}

export type SchemaDiffOperationType =
  | 'CREATE_TABLE'
  | 'ADD_COLUMN'
  | 'CREATE_INDEX'
  | 'CREATE_VIEW'
  | 'CREATE_TRIGGER'
  | 'DROP_INDEX'
  | 'DROP_VIEW'
  | 'DROP_TRIGGER'
  | 'DROP_TABLE';

export interface SchemaDiffOperation {
  type: SchemaDiffOperationType;
  sql: string;
  description: string;
  tableName?: string;
}

/**
 * A difference on an existing table that additive DDL cannot repair.
 *
 * SQLite cannot alter a primary key, a foreign key, a CHECK constraint or a
 * column default in place; repairing one means rebuilding the table and moving
 * its rows. That is a migration someone writes and reviews, so provisioning
 * reports it instead of attempting it — and never counts the table as in parity.
 */
export interface SchemaMigrationRequirement {
  tableName: string;
  kind:
    | 'PRIMARY_KEY'
    | 'FOREIGN_KEY'
    | 'CHECK_CONSTRAINT'
    | 'UNIQUE_CONSTRAINT'
    | 'COLUMN_DEFAULT'
    | 'COLUMN_TYPE'
    | 'COLUMN_NOT_NULL'
    | 'AUTOINCREMENT';
  description: string;
}

export interface SchemaSyncReport {
  executedAt: string;
  durationMs: number;
  /** Fingerprint of the repository-owned desired manifest for this database. */
  desiredSchemaVersion: string;
  tursoSchemaVersionBefore: string;
  tursoSchemaVersionAfter: string;
  operations: SchemaDiffOperation[];
  migrationsRequired: SchemaMigrationRequirement[];
  tablesModified: number;
  columnsAdded: number;
  indexesAdded: number;
  viewsAdded: number;
  triggersAdded: number;
  sqlExecuted: string[];
  /**
   * What the cloud schema *still* differs by after the sync applied everything it planned.
   *
   * It exists because "the DDL was sent" and "the cloud now matches" are not the same claim.
   * An operation can be counted as executed and still leave a difference — the `already exists`
   * branch swallows a failure by design, and a diff computed before the writes cannot see what
   * the writes actually produced. This field is measured by re-reading Turso and re-diffing, and
   * a non-empty value fails the sync rather than reporting success over a drifted database.
   */
  residualOperations: SchemaDiffOperation[];
  errors: string[];
  warnings: string[];
  skipped: boolean;
  skipReason?: string;
}

export interface TursoCredentials {
  url: string;
  authToken: string;
}

export interface TursoProvisionResult {
  databaseUrl: string;
  authToken: string;
  databaseName: string;
  created: boolean;
}
