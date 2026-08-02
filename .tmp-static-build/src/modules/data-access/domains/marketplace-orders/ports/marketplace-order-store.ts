export interface MarketplaceDb {
  execute(
    sql: string,
    params?: unknown[],
  ): Promise<Record<string, unknown>[]>;

  transaction<T>(work: (database: MarketplaceDb) => Promise<T>): Promise<T>;
}
