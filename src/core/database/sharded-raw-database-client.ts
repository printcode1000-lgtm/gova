import "server-only";

import path from "node:path";
import { createRequire } from "node:module";
import type { Client } from "@libsql/client";
import { readOptionalEnv } from "@/core/config/server-env.values";
import { isDevRuntime, SQLITE_DIRECTORY } from "./environment";
import { envPrefixForShard, sqliteFileNameForShard, type DatabaseShardName } from "./database-shards";

const nodeRequire = createRequire(import.meta.url);

export type ShardTableMap = Record<string, DatabaseShardName>;

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function normalizeParams(params: unknown[]): unknown[] {
  return params.map((value) => (typeof value === "boolean" ? (value ? 1 : 0) : value));
}

function isReadQuery(sql: string): boolean {
  return /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql);
}

function isTransactionControl(sql: string): boolean {
  return /^\s*(BEGIN|COMMIT|ROLLBACK)\b/i.test(sql);
}

function extractReferencedTables(sql: string, knownTables: Iterable<string>): string[] {
  const normalized = new Set<string>();
  const tableSet = new Set(knownTables);
  const patterns = [
    /\bFROM\s+["'`]?([A-Za-z_][\w]*)["'`]?/gi,
    /\bJOIN\s+["'`]?([A-Za-z_][\w]*)["'`]?/gi,
    /\bINTO\s+["'`]?([A-Za-z_][\w]*)["'`]?/gi,
    /\bUPDATE\s+["'`]?([A-Za-z_][\w]*)["'`]?/gi,
    /\bDELETE\s+FROM\s+["'`]?([A-Za-z_][\w]*)["'`]?/gi,
    /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([A-Za-z_][\w]*)["'`]?/gi,
    /\bON\s+["'`]?([A-Za-z_][\w]*)["'`]?/gi,
  ];

  for (const pattern of patterns) {
    for (const match of sql.matchAll(pattern)) {
      const table = match[1];
      if (tableSet.has(table)) normalized.add(table);
    }
  }
  return [...normalized];
}

export class ShardedRawDatabaseClient {
  private sqliteConnections = new Map<DatabaseShardName, any>();
  private tursoConnections = new Map<DatabaseShardName, Client>();

  constructor(
    private readonly tableMap: ShardTableMap,
    private readonly forcedShard?: DatabaseShardName,
  ) {}

  async execute(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    if (isTransactionControl(sql)) return [];

    const tables = extractReferencedTables(sql, Object.keys(this.tableMap));
    if (tables.length === 0 && this.forcedShard) {
      if (isDevRuntime()) return this.executeSqlite(this.forcedShard, sql, params);
      return this.executeTurso(this.forcedShard, sql, params);
    }
    if (tables.length === 0) {
      throw new Error(`Cannot route SQL without a known shard table: ${sql}`);
    }

    const shards = new Set(tables.map((table) => this.tableMap[table]));
    if (shards.size > 1) {
      throw new Error(
        `Cross-shard SQL is not allowed in the raw sharded client: ${[...shards].join(", ")}`,
      );
    }

    const shard = [...shards][0];
    if (isDevRuntime()) return this.executeSqlite(shard, sql, params);
    return this.executeTurso(shard, sql, params);
  }

  async transaction<T>(work: (db: ShardedRawDatabaseClient) => Promise<T>): Promise<T> {
    return work(this);
  }

  private sqlite(shard: DatabaseShardName): any {
    const existing = this.sqliteConnections.get(shard);
    if (existing) return existing;
    const sqliteModule = nodeRequire("better-sqlite3");
    const Database = sqliteModule.default ?? sqliteModule;
    const db = new Database(path.join(SQLITE_DIRECTORY, sqliteFileNameForShard(shard)));
    db.pragma("foreign_keys = ON");
    this.sqliteConnections.set(shard, db);
    return db;
  }

  private turso(shard: DatabaseShardName): Client {
    const existing = this.tursoConnections.get(shard);
    if (existing) return existing;
    const prefix = envPrefixForShard(shard);
    const url = readOptionalEnv(`${prefix}_DATABASE_URL`);
    const authToken = readOptionalEnv(`${prefix}_DATABASE_AUTH_TOKEN`);
    if (!url || !authToken) {
      throw new Error(`Missing Turso shard credentials for ${shard}`);
    }
    const { createClient } = nodeRequire("@libsql/client") as typeof import("@libsql/client");
    const client = createClient({ url, authToken });
    this.tursoConnections.set(shard, client);
    return client;
  }

  private async executeSqlite(
    shard: DatabaseShardName,
    sql: string,
    params: unknown[],
  ): Promise<Record<string, unknown>[]> {
    const statement = this.sqlite(shard).prepare(sql);
    const args = normalizeParams(params);
    if (isReadQuery(sql) || /\bRETURNING\b/i.test(sql)) {
      return statement.all(...args);
    }
    const result = statement.run(...args);
    return [{ changes: result.changes }];
  }

  private async executeTurso(
    shard: DatabaseShardName,
    sql: string,
    params: unknown[],
  ): Promise<Record<string, unknown>[]> {
    const result = await this.turso(shard).execute({ sql, args: normalizeParams(params) as any[] });
    if (isReadQuery(sql) || result.rows.length > 0) {
      return result.rows as Record<string, unknown>[];
    }
    return [{ changes: result.rowsAffected }];
  }

  async insert(table: string, data: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    const keys = Object.keys(data);
    return this.execute(
      `INSERT INTO ${quoteIdent(table)} (${keys.map(quoteIdent).join(",")}) VALUES (${keys
        .map(() => "?")
        .join(",")})`,
      keys.map((key) => data[key]),
    );
  }

  async select(
    table: string,
    where: Record<string, unknown>,
    limit?: number,
  ): Promise<Record<string, unknown>[]> {
    const entries = Object.entries(where);
    const whereClause =
      entries.length > 0
        ? ` WHERE ${entries
            .map(([key, value]) => `${quoteIdent(key)} ${value === null ? "IS NULL" : "= ?"}`)
            .join(" AND ")}`
        : "";
    const limitClause = limit ? ` LIMIT ${limit}` : "";
    return this.execute(
      `SELECT * FROM ${quoteIdent(table)}${whereClause}${limitClause}`,
      entries.filter(([, value]) => value !== null).map(([, value]) => value),
    );
  }

  async update(
    table: string,
    data: Record<string, unknown>,
    where: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const dataEntries = Object.entries(data);
    const whereEntries = Object.entries(where);
    return this.execute(
      `UPDATE ${quoteIdent(table)} SET ${dataEntries
        .map(([key]) => `${quoteIdent(key)}=?`)
        .join(",")} WHERE ${whereEntries
        .map(([key, value]) => `${quoteIdent(key)} ${value === null ? "IS NULL" : "= ?"}`)
        .join(" AND ")}`,
      [
        ...dataEntries.map(([, value]) => value),
        ...whereEntries.filter(([, value]) => value !== null).map(([, value]) => value),
      ],
    );
  }

  async delete(
    table: string,
    where: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    const entries = Object.entries(where);
    return this.execute(
      `DELETE FROM ${quoteIdent(table)} WHERE ${entries
        .map(([key, value]) => `${quoteIdent(key)} ${value === null ? "IS NULL" : "= ?"}`)
        .join(" AND ")}`,
      entries.filter(([, value]) => value !== null).map(([, value]) => value),
    );
  }
}
