import { createHash } from 'crypto';
import type { DatabaseSchema } from './types';

function normalizeType(type: string): string {
  return type.trim().toUpperCase();
}

/** Whitespace and quoting style are not schema. */
function normalizeStatement(sql: string): string {
  return sql.replace(/[`"\[\]]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Deterministic fingerprint of a database schema (structure only, no row data).
 *
 * Computed from the model, not from a file: the desired fingerprint is a
 * property of the repository-owned manifest, so it is reproducible in a build
 * with no database of any kind present.
 */
export function computeSchemaVersion(schema: DatabaseSchema): string {
  const parts: string[] = [];

  const tableNames = Object.keys(schema.tables).sort();
  for (const tableName of tableNames) {
    const table = schema.tables[tableName];
    // The table's identity, not its CREATE text. Two databases with identical
    // structure spell that statement differently — a column added by ALTER
    // arrives quoted differently from the original — so hashing the text made
    // the fingerprint report drift that the diff correctly found none of.
    parts.push(`table:${table.name}`);

    const columns = [...table.columns].sort((a, b) => a.name.localeCompare(b.name));
    for (const col of columns) {
      parts.push(
        `col:${table.name}:${col.name}:${normalizeType(col.type)}:${col.notNull}:${col.primaryKeyPosition}:${col.defaultValue ?? ''}`
      );
    }

    for (const foreignKey of [...table.foreignKeys].sort((left, right) =>
      left.columns.join().localeCompare(right.columns.join()),
    )) {
      parts.push(
        `fk:${table.name}:${foreignKey.columns.join(',')}->` +
          `${foreignKey.referencesTable}(${foreignKey.referencesColumns.join(',')})` +
          `:${foreignKey.onDelete}:${foreignKey.onUpdate}`,
      );
    }

    for (const columns of [...table.constraints.uniqueConstraints].sort((left, right) =>
      left.join().localeCompare(right.join()),
    )) {
      parts.push(`unique:${table.name}:${columns.join(',')}`);
    }
    for (const check of [...table.constraints.checks].sort()) {
      parts.push(`check:${table.name}:${check}`);
    }
    parts.push(`autoincrement:${table.name}:${table.constraints.autoIncrement}`);
  }

  const indexNames = Object.keys(schema.indexes).sort();
  for (const indexName of indexNames) {
    const index = schema.indexes[indexName];
    parts.push(
      `index:${index.name}:${index.tableName}:${index.unique}:${index.columns.join(',')}:${index.where ?? ''}`,
    );
  }

  const viewNames = Object.keys(schema.views).sort();
  for (const viewName of viewNames) {
    parts.push(`view:${normalizeStatement(schema.views[viewName].sql)}`);
  }

  const triggerNames = Object.keys(schema.triggers).sort();
  for (const triggerName of triggerNames) {
    parts.push(`trigger:${normalizeStatement(schema.triggers[triggerName].sql)}`);
  }

  return createHash('sha256').update(parts.join('\n')).digest('hex').slice(0, 16);
}
