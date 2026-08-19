export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}

export interface TableSchema {
  name: string;
  createSql: string;
  columns: ColumnInfo[];
}

export interface IndexSchema {
  name: string;
  tableName: string;
  sql: string;
  unique: boolean;
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

export interface SchemaSyncReport {
  executedAt: string;
  durationMs: number;
  sqliteSchemaVersion: string;
  tursoSchemaVersionBefore: string;
  tursoSchemaVersionAfter: string;
  operations: SchemaDiffOperation[];
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
