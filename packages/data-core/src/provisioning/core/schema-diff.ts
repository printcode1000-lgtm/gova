import type {
  ColumnInfo,
  DatabaseSchema,
  ForeignKeySchema,
  SchemaDiffOperation,
  SchemaMigrationRequirement,
  TableSchema,
} from './types';

/**
 * Compares a desired schema with the actual one read back from Turso.
 *
 * Two outputs, deliberately separate. `operations` is additive DDL that is safe
 * to apply: create a missing table, index, view or trigger, add a missing
 * column. `migrationsRequired` is everything additive DDL *cannot* repair —
 * a changed primary key, foreign key, CHECK constraint, uniqueness, default,
 * type or nullability on a table that already exists. SQLite can only fix those
 * by rebuilding the table and moving its rows, which is a migration a person
 * writes and reviews, never something a release step should improvise.
 *
 * The distinction is the safety property: a requirement that cannot be repaired
 * is reported and fails parity, instead of being silently counted as synced.
 */

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function buildAddColumnSql(tableName: string, column: ColumnInfo): string {
  const parts = [quoteIdent(column.name), column.type.toUpperCase() || 'TEXT'];

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

/**
 * Compares two column defaults as values rather than as text.
 *
 * SQLite stores a default exactly as it was written, so the same value arrives
 * as `'client'` from one statement and `"client"` from another, and `0` from one
 * and `false` from a Drizzle-generated one. Ignoring defaults entirely — the
 * previous behaviour — hides a genuinely different default; comparing raw text
 * reports drift that does not exist. Normalizing quoting, case and the two
 * boolean spellings is the comparison that answers the actual question.
 */
function normalizeDefault(value: string | null): string | null {
  if (value == null) return null;
  let text = value.trim();
  if (/^'[\s\S]*'$/.test(text) || /^"[\s\S]*"$/.test(text)) {
    text = text.slice(1, -1);
  } else {
    const upper = text.toUpperCase();
    if (upper === 'FALSE') return '0';
    if (upper === 'TRUE') return '1';
    if (upper === 'NULL') return null;
    return upper.replace(/\s+/g, ' ');
  }
  return text;
}

function defaultsMatch(desired: ColumnInfo, actual: ColumnInfo): boolean {
  return normalizeDefault(desired.defaultValue) === normalizeDefault(actual.defaultValue);
}

function compatibleType(desired: ColumnInfo, actual: ColumnInfo): boolean {
  const left = normalizeColumnType(desired.type);
  const right = normalizeColumnType(actual.type);
  if (left === right) return true;
  // A timestamp column is written as TEXT by the domain code and reported as
  // DATETIME by some generators; both store the same ISO string.
  const temporal = new Set(['TEXT', 'DATETIME']);
  if (desired.name.endsWith('_at') && temporal.has(left) && temporal.has(right)) return true;
  return false;
}

function compatibleNotNull(desired: ColumnInfo, actual: ColumnInfo): boolean {
  if (desired.notNull === actual.notNull) return true;
  // `INTEGER PRIMARY KEY` is the rowid alias: SQLite reports it as nullable even
  // when it is declared NOT NULL, and it can never actually hold NULL.
  const left = normalizeColumnType(desired.type);
  const right = normalizeColumnType(actual.type);
  return (
    desired.primaryKeyPosition > 0 &&
    actual.primaryKeyPosition > 0 &&
    left === 'INTEGER' &&
    right === 'INTEGER'
  );
}

function primaryKeyOf(table: TableSchema): string[] {
  return table.columns
    .filter((column) => column.primaryKeyPosition > 0)
    .sort((left, right) => left.primaryKeyPosition - right.primaryKeyPosition)
    .map((column) => column.name);
}

function foreignKeyKey(foreignKey: ForeignKeySchema): string {
  return [
    foreignKey.columns.join(','),
    foreignKey.referencesTable,
    foreignKey.referencesColumns.join(','),
    foreignKey.onDelete.toUpperCase(),
    foreignKey.onUpdate.toUpperCase(),
  ].join('->');
}

function uniqueKeys(table: TableSchema): Set<string> {
  return new Set(table.constraints.uniqueConstraints.map((columns) => columns.join(',')));
}

function compareExistingTable(
  desired: TableSchema,
  actual: TableSchema,
): SchemaMigrationRequirement[] {
  const requirements: SchemaMigrationRequirement[] = [];
  const tableName = desired.name;
  const actualColumns = new Map(actual.columns.map((column) => [column.name, column]));

  for (const column of desired.columns) {
    const existing = actualColumns.get(column.name);
    if (!existing) continue;
    if (!compatibleType(column, existing)) {
      requirements.push({
        tableName,
        kind: 'COLUMN_TYPE',
        description: `Column "${tableName}.${column.name}" is ${existing.type} on Turso, desired ${column.type}.`,
      });
    }
    if (!compatibleNotNull(column, existing)) {
      requirements.push({
        tableName,
        kind: 'COLUMN_NOT_NULL',
        description: `Column "${tableName}.${column.name}" nullability differs: Turso notNull=${existing.notNull}, desired notNull=${column.notNull}.`,
      });
    }
    if (!defaultsMatch(column, existing)) {
      requirements.push({
        tableName,
        kind: 'COLUMN_DEFAULT',
        description: `Column "${tableName}.${column.name}" default differs: Turso ${existing.defaultValue ?? 'none'}, desired ${column.defaultValue ?? 'none'}.`,
      });
    }
  }

  const desiredKey = primaryKeyOf(desired).join(',');
  const actualKey = primaryKeyOf(actual).join(',');
  if (desiredKey !== actualKey) {
    requirements.push({
      tableName,
      kind: 'PRIMARY_KEY',
      description: `Primary key of "${tableName}" is (${actualKey || 'none'}) on Turso, desired (${desiredKey || 'none'}).`,
    });
  }

  if (desired.constraints.autoIncrement !== actual.constraints.autoIncrement) {
    requirements.push({
      tableName,
      kind: 'AUTOINCREMENT',
      description: `AUTOINCREMENT on "${tableName}" is ${actual.constraints.autoIncrement} on Turso, desired ${desired.constraints.autoIncrement}.`,
    });
  }

  const actualForeignKeys = new Set(actual.foreignKeys.map(foreignKeyKey));
  for (const foreignKey of desired.foreignKeys) {
    if (!actualForeignKeys.has(foreignKeyKey(foreignKey))) {
      requirements.push({
        tableName,
        kind: 'FOREIGN_KEY',
        description: `Foreign key ${tableName}(${foreignKey.columns.join(',')}) -> ${foreignKey.referencesTable}(${foreignKey.referencesColumns.join(',')}) is missing on Turso.`,
      });
    }
  }

  const actualUnique = uniqueKeys(actual);
  for (const columns of desired.constraints.uniqueConstraints) {
    if (!actualUnique.has(columns.join(','))) {
      requirements.push({
        tableName,
        kind: 'UNIQUE_CONSTRAINT',
        description: `UNIQUE(${columns.join(',')}) on "${tableName}" is missing on Turso.`,
      });
    }
  }

  const actualChecks = new Set(actual.constraints.checks);
  for (const check of desired.constraints.checks) {
    if (!actualChecks.has(check)) {
      requirements.push({
        tableName,
        kind: 'CHECK_CONSTRAINT',
        description: `CHECK (${check}) on "${tableName}" is missing on Turso.`,
      });
    }
  }

  return requirements;
}

export interface SchemaDiffOptions {
  ignoredExtraTables?: Set<string>;
  /**
   * Drop objects Turso has and the manifest does not.
   *
   * Never the default. Historical tables from removed capabilities live in
   * production databases, and a code refactor is not authorization to destroy
   * cloud data — an extra is a warning until someone explicitly asks for cleanup.
   */
  removeExtraObjects?: boolean;
}

export interface SchemaDiffResult {
  operations: SchemaDiffOperation[];
  migrationsRequired: SchemaMigrationRequirement[];
  warnings: string[];
}

/**
 * The additive DDL that makes Turso match the desired schema, plus everything
 * that additive DDL cannot fix. Schema only — never INSERT/UPDATE/DELETE.
 */
export function diffSchemas(
  desiredSchema: DatabaseSchema,
  actualSchema: DatabaseSchema,
  options: SchemaDiffOptions = {},
): SchemaDiffResult {
  const operations: SchemaDiffOperation[] = [];
  const migrationsRequired: SchemaMigrationRequirement[] = [];
  const warnings: string[] = [];

  for (const tableName of Object.keys(desiredSchema.tables).sort()) {
    const desiredTable = desiredSchema.tables[tableName];
    const actualTable = actualSchema.tables[tableName];

    if (!actualTable) {
      operations.push({
        type: 'CREATE_TABLE',
        tableName,
        sql: desiredTable.createSql,
        description: `Create missing table "${tableName}"`,
      });
      continue;
    }

    const actualColumns = new Map(actualTable.columns.map((column) => [column.name, column]));
    for (const column of desiredTable.columns) {
      if (actualColumns.has(column.name)) continue;
      operations.push({
        type: 'ADD_COLUMN',
        tableName,
        sql: buildAddColumnSql(tableName, column),
        description: `Add column "${tableName}.${column.name}"`,
      });
    }

    for (const actualColumn of actualTable.columns) {
      if (!desiredTable.columns.some((column) => column.name === actualColumn.name)) {
        warnings.push(
          `Column "${tableName}.${actualColumn.name}" exists on Turso but not in the desired schema. Not removed automatically.`,
        );
      }
    }

    migrationsRequired.push(...compareExistingTable(desiredTable, actualTable));
  }

  for (const actualTableName of Object.keys(actualSchema.tables)) {
    if (desiredSchema.tables[actualTableName]) continue;
    if (options.ignoredExtraTables?.has(actualTableName)) continue;
    if (options.removeExtraObjects) {
      operations.push({
        type: 'DROP_TABLE',
        tableName: actualTableName,
        sql: `DROP TABLE IF EXISTS ${quoteIdent(actualTableName)}`,
        description: `Drop extra table "${actualTableName}"`,
      });
      continue;
    }
    warnings.push(
      `Table "${actualTableName}" exists on Turso but not in the desired schema. Not dropped automatically.`,
    );
  }

  for (const indexName of Object.keys(desiredSchema.indexes).sort()) {
    const desiredIndex = desiredSchema.indexes[indexName];
    const actualIndex = actualSchema.indexes[indexName];
    if (!actualIndex) {
      operations.push({
        type: 'CREATE_INDEX',
        tableName: desiredIndex.tableName,
        sql: desiredIndex.sql.endsWith(';') ? desiredIndex.sql : `${desiredIndex.sql};`,
        description: `Create missing index "${indexName}"`,
      });
      continue;
    }
    if (
      desiredIndex.unique !== actualIndex.unique ||
      desiredIndex.columns.join(',') !== actualIndex.columns.join(',') ||
      (desiredIndex.where ?? '') !== (actualIndex.where ?? '')
    ) {
      migrationsRequired.push({
        tableName: desiredIndex.tableName,
        kind: 'UNIQUE_CONSTRAINT',
        description:
          `Index "${indexName}" differs: Turso unique=${actualIndex.unique} ` +
          `(${actualIndex.columns.join(',')})${actualIndex.where ? ` WHERE ${actualIndex.where}` : ''}, ` +
          `desired unique=${desiredIndex.unique} (${desiredIndex.columns.join(',')})` +
          `${desiredIndex.where ? ` WHERE ${desiredIndex.where}` : ''}.`,
      });
    }
  }

  if (options.removeExtraObjects) {
    for (const indexName of Object.keys(actualSchema.indexes).sort()) {
      if (desiredSchema.indexes[indexName]) continue;
      const index = actualSchema.indexes[indexName];
      if (options.ignoredExtraTables?.has(index.tableName)) continue;
      operations.push({
        type: 'DROP_INDEX',
        tableName: index.tableName,
        sql: `DROP INDEX IF EXISTS ${quoteIdent(indexName)}`,
        description: `Drop extra index "${indexName}"`,
      });
    }
  }

  for (const viewName of Object.keys(desiredSchema.views).sort()) {
    if (actualSchema.views[viewName]) continue;
    const view = desiredSchema.views[viewName];
    operations.push({
      type: 'CREATE_VIEW',
      sql: view.sql.endsWith(';') ? view.sql : `${view.sql};`,
      description: `Create missing view "${viewName}"`,
    });
  }

  if (options.removeExtraObjects) {
    for (const viewName of Object.keys(actualSchema.views).sort()) {
      if (desiredSchema.views[viewName]) continue;
      operations.push({
        type: 'DROP_VIEW',
        sql: `DROP VIEW IF EXISTS ${quoteIdent(viewName)}`,
        description: `Drop extra view "${viewName}"`,
      });
    }
  }

  for (const triggerName of Object.keys(desiredSchema.triggers).sort()) {
    if (actualSchema.triggers[triggerName]) continue;
    const trigger = desiredSchema.triggers[triggerName];
    operations.push({
      type: 'CREATE_TRIGGER',
      sql: trigger.sql.endsWith(';') ? trigger.sql : `${trigger.sql};`,
      description: `Create missing trigger "${triggerName}"`,
    });
  }

  if (options.removeExtraObjects) {
    for (const triggerName of Object.keys(actualSchema.triggers).sort()) {
      if (desiredSchema.triggers[triggerName]) continue;
      operations.push({
        type: 'DROP_TRIGGER',
        sql: `DROP TRIGGER IF EXISTS ${quoteIdent(triggerName)}`,
        description: `Drop extra trigger "${triggerName}"`,
      });
    }
  }

  return {
    operations: operations.sort((left, right) => operationOrder(left.type) - operationOrder(right.type)),
    migrationsRequired,
    warnings,
  };
}

function operationOrder(type: SchemaDiffOperation['type']): number {
  switch (type) {
    case 'DROP_TRIGGER':
      return 0;
    case 'DROP_VIEW':
      return 1;
    case 'DROP_INDEX':
      return 2;
    case 'DROP_TABLE':
      return 3;
    default:
      return 10;
  }
}
