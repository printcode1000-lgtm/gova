import type { ColumnInfo, DatabaseSchema, SchemaDiffOperation } from './types';

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function buildAddColumnSql(tableName: string, column: ColumnInfo): string {
  const parts = [
    quoteIdent(column.name),
    column.type.toUpperCase() || 'TEXT',
  ];

  if (column.primaryKey) {
    parts.push('PRIMARY KEY');
  }

  if (column.notNull) {
    if (column.defaultValue != null) {
      parts.push('NOT NULL', 'DEFAULT', column.defaultValue);
    } else {
      parts.push('NOT NULL', "DEFAULT ''");
    }
  } else if (column.defaultValue != null) {
    parts.push('DEFAULT', column.defaultValue);
  }

  return `ALTER TABLE ${quoteIdent(tableName)} ADD COLUMN ${parts.join(' ')}`;
}

function normalizeColumnType(type: string): string {
  return type.trim().toUpperCase().replace(/\s+/g, ' ');
}

export interface SchemaDiffOptions {
  ignoredExtraTables?: Set<string>;
}

function compatibleType(a: ColumnInfo, b: ColumnInfo): boolean {
  const left = normalizeColumnType(a.type);
  const right = normalizeColumnType(b.type);
  if (left === right) return true;
  const temporal = new Set(['TEXT', 'DATETIME']);
  if (a.name.endsWith('_at') && temporal.has(left) && temporal.has(right)) return true;
  return false;
}

function compatibleNotNull(a: ColumnInfo, b: ColumnInfo): boolean {
  if (a.notNull === b.notNull) return true;
  const left = normalizeColumnType(a.type);
  const right = normalizeColumnType(b.type);
  if (a.primaryKey && b.primaryKey && left === 'INTEGER' && right === 'INTEGER') return true;
  return false;
}

function columnsMatch(a: ColumnInfo, b: ColumnInfo): boolean {
  return (
    compatibleType(a, b) &&
    compatibleNotNull(a, b) &&
    a.primaryKey === b.primaryKey
  );
}

/**
 * Computes the minimal set of DDL statements needed to make Turso match SQLite.
 * Schema only — never generates INSERT/UPDATE/DELETE.
 */
export function diffSchemas(
  sqliteSchema: DatabaseSchema,
  tursoSchema: DatabaseSchema,
  options: SchemaDiffOptions = {}
): { operations: SchemaDiffOperation[]; warnings: string[] } {
  const operations: SchemaDiffOperation[] = [];
  const warnings: string[] = [];

  for (const tableName of Object.keys(sqliteSchema.tables).sort()) {
    const sqliteTable = sqliteSchema.tables[tableName];
    const tursoTable = tursoSchema.tables[tableName];

    if (!tursoTable) {
      operations.push({
        type: 'CREATE_TABLE',
        tableName,
        sql: sqliteTable.createSql,
        description: `Create missing table "${tableName}"`,
      });
      continue;
    }

    const tursoColumns = new Map(tursoTable.columns.map((col) => [col.name, col]));

    for (const column of sqliteTable.columns) {
      const existing = tursoColumns.get(column.name);
      if (!existing) {
        operations.push({
          type: 'ADD_COLUMN',
          tableName,
          sql: buildAddColumnSql(tableName, column),
          description: `Add column "${tableName}.${column.name}"`,
        });
        continue;
      }

      if (!columnsMatch(column, existing)) {
        warnings.push(
          `Column "${tableName}.${column.name}" differs in type/constraints. Manual migration may be required (no DROP+CREATE).`
        );
      }
    }

    for (const tursoColumn of tursoTable.columns) {
      if (!sqliteTable.columns.some((col) => col.name === tursoColumn.name)) {
        warnings.push(
          `Column "${tableName}.${tursoColumn.name}" exists on Turso but not in SQLite. Not removed automatically.`
        );
      }
    }
  }

  for (const tursoTableName of Object.keys(tursoSchema.tables)) {
    if (!sqliteSchema.tables[tursoTableName]) {
      if (options.ignoredExtraTables?.has(tursoTableName)) continue;
      warnings.push(
        `Table "${tursoTableName}" exists on Turso but not in SQLite. Not dropped automatically.`
      );
    }
  }

  for (const indexName of Object.keys(sqliteSchema.indexes).sort()) {
    if (tursoSchema.indexes[indexName]) continue;

    const index = sqliteSchema.indexes[indexName];
    operations.push({
      type: 'CREATE_INDEX',
      tableName: index.tableName,
      sql: index.sql.endsWith(';') ? index.sql : `${index.sql};`,
      description: `Create missing index "${indexName}"`,
    });
  }

  for (const viewName of Object.keys(sqliteSchema.views).sort()) {
    if (tursoSchema.views[viewName]) continue;
    const view = sqliteSchema.views[viewName];
    operations.push({
      type: 'CREATE_VIEW',
      sql: view.sql.endsWith(';') ? view.sql : `${view.sql};`,
      description: `Create missing view "${viewName}"`,
    });
  }

  for (const triggerName of Object.keys(sqliteSchema.triggers).sort()) {
    if (tursoSchema.triggers[triggerName]) continue;
    const trigger = sqliteSchema.triggers[triggerName];
    operations.push({
      type: 'CREATE_TRIGGER',
      sql: trigger.sql.endsWith(';') ? trigger.sql : `${trigger.sql};`,
      description: `Create missing trigger "${triggerName}"`,
    });
  }

  return { operations, warnings };
}
