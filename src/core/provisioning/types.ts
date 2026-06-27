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
  | 'CREATE_TRIGGER';

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
