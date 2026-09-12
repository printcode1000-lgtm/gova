export interface DatabaseBatchStatement {
  sql: string;
  params?: any[];
}

export interface IDatabaseClient {
  /**
   * Drizzle ORM database instance.
   */
  db: any;

  /**
   * Executes a raw SQL query with parameters.
   */
  execute(sql: string, params?: any[]): Promise<any[]>;

  /** Executes statements atomically when the backing database supports it. */
  batch?(statements: DatabaseBatchStatement[]): Promise<any[][]>;

  /**
   * Generic INSERT helper.
   */
  insert(table: string, data: Record<string, any>): Promise<any>;

  /**
   * Generic SELECT helper.
   */
  select(table: string, where: Record<string, any>, limit?: number): Promise<any[]>;

  /**
   * Generic UPDATE helper.
   */
  update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<any>;

  /**
   * Generic DELETE helper.
   */
  delete(table: string, where: Record<string, any>): Promise<any>;
}
