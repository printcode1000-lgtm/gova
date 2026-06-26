import type { IDatabaseClient } from './database-client.interface';

export abstract class AbstractDatabaseClient implements IDatabaseClient {
  abstract get db(): any;
  abstract execute(sql: string, params?: any[]): Promise<any[]>;

  async insert(table: string, data: Record<string, any>): Promise<any> {
    const keys = Object.keys(data);
    const columns = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    const params = Object.values(data);
    
    return this.execute(sql, params);
  }

  async select(table: string, where: Record<string, any>, limit?: number): Promise<any[]> {
    const keys = Object.keys(where);
    const conditions = keys.map((key) => {
      if (where[key] === null) {
        return `${key} IS NULL`;
      }
      return `${key} = ?`;
    });
    
    const whereClause = keys.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = limit ? `LIMIT ${limit}` : '';
    const sql = `SELECT * FROM ${table} ${whereClause} ${limitClause}`.trim();
    
    const params = Object.values(where).filter((val) => val !== null);
    
    return this.execute(sql, params);
  }

  async update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<any> {
    const setKeys = Object.keys(data);
    const setClause = setKeys.map((key) => `${key} = ?`).join(', ');
    
    const whereKeys = Object.keys(where);
    const whereConditions = whereKeys.map((key) => {
      if (where[key] === null) {
        return `${key} IS NULL`;
      }
      return `${key} = ?`;
    });
    
    const whereClause = whereKeys.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const sql = `UPDATE ${table} SET ${setClause} ${whereClause}`;
    
    const params = [
      ...Object.values(data),
      ...Object.values(where).filter((val) => val !== null),
    ];
    
    return this.execute(sql, params);
  }

  async delete(table: string, where: Record<string, any>): Promise<any> {
    const keys = Object.keys(where);
    const conditions = keys.map((key) => {
      if (where[key] === null) {
        return `${key} IS NULL`;
      }
      return `${key} = ?`;
    });
    
    const whereClause = keys.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `DELETE FROM ${table} ${whereClause}`;
    
    const params = Object.values(where).filter((val) => val !== null);
    
    return this.execute(sql, params);
  }
}
