import type { IDatabaseClient } from './database-client.interface';
import { traceDatabaseQuery } from '../../ports/telemetry';
import { assertServerDataAccessRuntime } from './environment';

export abstract class AbstractDatabaseClient implements IDatabaseClient {
  // Public because `DataSourceRegistry` constructs the adapters directly. It used to reach
  // them through an untyped `require()`, which hid the protected constructor from the
  // compiler; the adapters are internal files behind no package door, so the registry stays
  // the only possible construction site and the runtime guard below still holds.
  constructor() {
    assertServerDataAccessRuntime();
  }

  abstract get db(): any;
  abstract rawExecute(sql: string, params?: any[]): Promise<any[]>;

  async execute(sql: string, params?: any[]): Promise<any[]> {
    return this._trackedExecute(sql, params);
  }

  /**
   * Every statement goes through here. Assembling the observation is the application's job —
   * this method only names what it is about to run and hands over the action, so the monitor's
   * event shape, its session and flow identifiers, and its memory sampling stay out of the
   * package entirely. With no telemetry registered the port runs the action untouched, which
   * is also the production path.
   */
  protected async _trackedExecute(sql: string, params: any[] = []): Promise<any[]> {
    const driver = this.constructor.name.includes('Turso') ? 'Turso-Production' : 'SQLite-Dev';
    return traceDatabaseQuery(
      { driver, sql, params, table: extractTable(sql) },
      () => this.rawExecute(sql, params),
    );
  }

  // ─── Helper methods that call _trackedExecute ─────────────────────────────
  async insert(table: string, data: Record<string, any>): Promise<any> {
    const keys = Object.keys(data);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const params = Object.values(data);
    return this._trackedExecute(sql, params);
  }

  async select(table: string, where: Record<string, any>, limit?: number): Promise<any[]> {
    const keys = Object.keys(where);
    const conditions = keys.map((key) =>
      where[key] === null ? `${key} IS NULL` : `${key} = ?`
    );
    const whereClause = keys.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = limit ? `LIMIT ${limit}` : '';
    const sql = `SELECT * FROM ${table} ${whereClause} ${limitClause}`.trim();
    const params = Object.values(where).filter((v) => v !== null);
    return this._trackedExecute(sql, params);
  }

  async update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<any> {
    const setKeys = Object.keys(data);
    const setClause = setKeys.map((key) => `${key} = ?`).join(', ');
    const whereKeys = Object.keys(where);
    const whereConditions = whereKeys.map((key) =>
      where[key] === null ? `${key} IS NULL` : `${key} = ?`
    );
    const whereClause = whereKeys.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const sql = `UPDATE ${table} SET ${setClause} ${whereClause}`;
    const params = [
      ...Object.values(data),
      ...Object.values(where).filter((v) => v !== null),
    ];
    return this._trackedExecute(sql, params);
  }

  async delete(table: string, where: Record<string, any>): Promise<any> {
    const keys = Object.keys(where);
    const conditions = keys.map((key) =>
      where[key] === null ? `${key} IS NULL` : `${key} = ?`
    );
    const whereClause = keys.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `DELETE FROM ${table} ${whereClause}`;
    const params = Object.values(where).filter((v) => v !== null);
    return this._trackedExecute(sql, params);
  }
}

// ─── Utility: extract table name from SQL ─────────────────────────────────────
function extractTable(sql: string): string {
  const upper = sql.trim().toUpperCase();
  if (upper.startsWith('SELECT')) {
    const m = sql.match(/FROM\s+["'`]?(\w+)["'`]?/i);
    return m?.[1] ?? '';
  }
  if (upper.startsWith('INSERT')) {
    const m = sql.match(/INTO\s+["'`]?(\w+)["'`]?/i);
    return m?.[1] ?? '';
  }
  if (upper.startsWith('UPDATE')) {
    const m = sql.match(/UPDATE\s+["'`]?(\w+)["'`]?/i);
    return m?.[1] ?? '';
  }
  if (upper.startsWith('DELETE')) {
    const m = sql.match(/FROM\s+["'`]?(\w+)["'`]?/i);
    return m?.[1] ?? '';
  }
  return '';
}
