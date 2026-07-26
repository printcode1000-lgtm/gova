import { createHash } from 'crypto';
import type { DatabaseSchema } from './types';

function normalizeType(type: string): string {
  return type.trim().toUpperCase();
}

/**
 * Deterministic fingerprint of a database schema (structure only, no row data).
 */
export function computeSchemaVersion(schema: DatabaseSchema): string {
  const parts: string[] = [];

  const tableNames = Object.keys(schema.tables).sort();
  for (const tableName of tableNames) {
    const table = schema.tables[tableName];
    parts.push(`table:${table.name}:${table.createSql}`);

    const columns = [...table.columns].sort((a, b) => a.name.localeCompare(b.name));
    for (const col of columns) {
      parts.push(
        `col:${table.name}:${col.name}:${normalizeType(col.type)}:${col.notNull}:${col.primaryKey}:${col.defaultValue ?? ''}`
      );
    }
  }

  const indexNames = Object.keys(schema.indexes).sort();
  for (const indexName of indexNames) {
    parts.push(`index:${schema.indexes[indexName].sql}`);
  }

  const viewNames = Object.keys(schema.views).sort();
  for (const viewName of viewNames) {
    parts.push(`view:${schema.views[viewName].sql}`);
  }

  const triggerNames = Object.keys(schema.triggers).sort();
  for (const triggerName of triggerNames) {
    parts.push(`trigger:${schema.triggers[triggerName].sql}`);
  }

  return createHash('sha256').update(parts.join('\n')).digest('hex').slice(0, 16);
}
