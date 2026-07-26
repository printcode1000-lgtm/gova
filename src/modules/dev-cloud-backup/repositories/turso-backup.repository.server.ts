import "server-only";

import { createClient, type Client } from "@libsql/client";

import { readOptionalEnv } from "@/core/config/server-env.values";

import type { DevCloudBackupDatabaseManifest } from "../domain/types";

type Row = Record<string, unknown>;

export interface TursoBackupSource {
  id: string;
  label: string;
  urlKey: string;
  tokenKey: string;
}

export interface TursoDatabaseBackup {
  manifest: DevCloudBackupDatabaseManifest;
  files: Record<string, Uint8Array>;
  rowCount: number;
}

export const TURSO_BACKUP_SOURCES: TursoBackupSource[] = [
  {
    id: "allusers",
    label: "All users",
    urlKey: "TURSO_DATABASE_URL",
    tokenKey: "TURSO_AUTH_TOKEN",
  },
  {
    id: "profile",
    label: "Profile",
    urlKey: "TURSO_PROFILE_DATABASE_URL",
    tokenKey: "TURSO_PROFILE_AUTH_TOKEN",
  },
  {
    id: "product",
    label: "Product",
    urlKey: "TURSO_PRODUCT_DATABASE_URL",
    tokenKey: "TURSO_PRODUCT_AUTH_TOKEN",
  },
  {
    id: "advertisements",
    label: "Advertisements",
    urlKey: "TURSO_ADVERTISEMENTS_DATABASE_URL",
    tokenKey: "TURSO_ADVERTISEMENTS_AUTH_TOKEN",
  },
  {
    id: "marketplace-orders",
    label: "Marketplace orders",
    urlKey: "MARKETPLACE_ORDERS_DATABASE_URL",
    tokenKey: "MARKETPLACE_ORDERS_DATABASE_AUTH_TOKEN",
  },
];

function encodeJson(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value, null, 2));
}

function decodeJson<T>(value: Uint8Array): T {
  return JSON.parse(new TextDecoder().decode(value)) as T;
}

function quoteIdent(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return `X'${Buffer.from(value).toString("hex")}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function rowsOf(result: unknown): Row[] {
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown }).rows)
  ) {
    return (result as { rows: Row[] }).rows;
  }
  return [];
}

function getCredentials(source: TursoBackupSource) {
  const url = readOptionalEnv(source.urlKey)?.trim();
  const authToken = readOptionalEnv(source.tokenKey)?.trim();
  return url && authToken ? { url, authToken } : null;
}

async function listTables(client: Client): Promise<string[]> {
  const result = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return rowsOf(result)
    .map((row) => String(row.name ?? ""))
    .filter(Boolean);
}

async function readSchema(client: Client): Promise<string> {
  const result = await client.execute(
    "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type, name",
  );
  return rowsOf(result)
    .map((row) => `${String(row.sql ?? "").trim()};`)
    .filter((sql) => sql.length > 1)
    .join("\n\n");
}

export class TursoBackupRepository {
  sources() {
    return TURSO_BACKUP_SOURCES;
  }

  async exportDatabase(source: TursoBackupSource): Promise<TursoDatabaseBackup> {
    const credentials = getCredentials(source);
    const exportedAt = new Date().toISOString();
    const base = `turso/${source.id}`;
    if (!credentials) {
      throw new Error("devCloudBackupTursoSourceMissing");
    }

    const client = createClient(credentials);
    try {
      const files: Record<string, Uint8Array> = {};
      const schemaFile = `${base}/schema.sql`;
      files[schemaFile] = new TextEncoder().encode(await readSchema(client));
      const tables = await listTables(client);
      let rowCount = 0;
      const tableManifests: DevCloudBackupDatabaseManifest["tables"] = [];
      for (const table of tables) {
        const rows = rowsOf(await client.execute(`SELECT * FROM ${quoteIdent(table)}`));
        const file = `${base}/data/${table}.json`;
        files[file] = encodeJson(rows);
        rowCount += rows.length;
        tableManifests.push({ name: table, rowCount: rows.length, file });
      }
      return {
        rowCount,
        files,
        manifest: {
          id: source.id,
          label: source.label,
          schemaFile,
          tables: tableManifests,
          exportedAt,
        },
      };
    } finally {
      client.close();
    }
  }

  async restoreDatabase(
    manifest: DevCloudBackupDatabaseManifest,
    files: Record<string, Uint8Array>,
    mode: "merge" | "replace",
  ): Promise<{ tableCount: number; rowCount: number }> {
    const source = TURSO_BACKUP_SOURCES.find((item) => item.id === manifest.id);
    if (!source) return { tableCount: 0, rowCount: 0 };
    const credentials = getCredentials(source);
    if (!credentials) throw new Error(`Missing Turso credentials for ${source.id}`);

    const client = createClient(credentials);
    let rowCount = 0;
    try {
      await client.execute("PRAGMA foreign_keys = OFF");
      await client.execute("BEGIN");
      try {
        if (mode === "replace") {
          for (const table of [...manifest.tables].reverse()) {
            await client.execute(`DELETE FROM ${quoteIdent(table.name)}`);
          }
        }
        for (const table of manifest.tables) {
          const payload = files[table.file];
          if (!payload) throw new Error(`Missing backup table file: ${table.file}`);
          const rows = decodeJson<Row[]>(payload);
          for (const row of rows) {
            const columns = Object.keys(row);
            if (columns.length === 0) continue;
            const sql = `INSERT OR REPLACE INTO ${quoteIdent(table.name)} (${columns
              .map(quoteIdent)
              .join(",")}) VALUES (${columns.map((column) => sqlLiteral(row[column])).join(",")})`;
            await client.execute(sql);
            rowCount += 1;
          }
        }
        await client.execute("COMMIT");
      } catch (error) {
        await client.execute("ROLLBACK").catch(() => undefined);
        throw error;
      }
      return { tableCount: manifest.tables.length, rowCount };
    } finally {
      await client.execute("PRAGMA foreign_keys = ON").catch(() => undefined);
      client.close();
    }
  }
}

export const tursoBackupRepository = new TursoBackupRepository();
