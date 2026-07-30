import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import {
  DATABASE_SHARDS as ALL_DATABASE_SHARDS,
  DATABASE_SHARDS,
  envPrefixForShard,
  sqliteFileNameForShard,
  type DatabaseShardName,
} from "../src/core/database/database-shards";
import { SQLITE_DIRECTORY } from "../src/core/database/environment";

type TursoDatabase = { Name: string; Hostname: string; hostname?: string };

function readEnvFiles(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const file of [".env.local", ".env"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
      if (match && values[match[1]] === undefined) values[match[1]] = match[2];
    }
  }
  return values;
}

function updateEnvFile(filePath: string, entries: Record<string, string>): void {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");
  for (const [key, value] of Object.entries(entries)) {
    const line = `${key}=${value}`;
    if (content.includes(`${key}=`)) {
      content = content.replace(new RegExp(`^${key}=.*$`, "m"), line);
    } else {
      content += `${content.endsWith("\n") ? "" : "\n"}${line}\n`;
    }
  }
  fs.writeFileSync(filePath, content, "utf8");
}

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (Buffer.isBuffer(value)) return `X'${value.toString("hex")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function platformFetch<T>(
  organization: string,
  token: string,
  pathName: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`https://api.turso.tech/v1${pathName}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Turso API ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as T;
}

async function listDatabases(organization: string, token: string): Promise<TursoDatabase[]> {
  const data = await platformFetch<{ databases?: TursoDatabase[] }>(
    organization,
    token,
    `/organizations/${organization}/databases`,
  );
  return data.databases ?? [];
}

async function ensureDatabase(
  organization: string,
  token: string,
  databaseName: DatabaseShardName,
): Promise<TursoDatabase> {
  const existing = (await listDatabases(organization, token)).find(
    (database) => database.Name === databaseName,
  );
  if (existing) return existing;

  const data = await platformFetch<{ database: TursoDatabase }>(
    organization,
    token,
    `/organizations/${organization}/databases`,
    {
      method: "POST",
      body: JSON.stringify({ name: databaseName, group: "default" }),
    },
  );
  return data.database;
}

async function createToken(
  organization: string,
  token: string,
  databaseName: string,
): Promise<string> {
  const data = await platformFetch<{ jwt: string }>(
    organization,
    token,
    `/organizations/${organization}/databases/${databaseName}/auth/tokens?expiration=never&authorization=full-access`,
    { method: "POST" },
  );
  return data.jwt;
}

function schemaSql(db: Database.Database, table: string): string[] {
  const rows = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND ((type='table' AND name=?) OR (tbl_name=? AND type IN ('index','trigger','view'))) ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 ELSE 3 END",
    )
    .all(table, table) as { sql: string }[];
  return rows.map((row) => row.sql);
}

function referencesOutsideShard(sql: string, shardTables: readonly string[]): boolean {
  const own = new Set(shardTables);
  const allTables = Object.values(ALL_DATABASE_SHARDS).flat();
  return allTables.some((table) => !own.has(table) && new RegExp(`\\b${table}\\b`, "i").test(sql));
}

function stripCrossDatabaseReferences(sql: string): string {
  if (!/^CREATE\s+TABLE\b/i.test(sql)) return sql;
  return sql
    .replace(
      /,\s*FOREIGN\s+KEY\s*\([^)]+\)\s+REFERENCES\s+"?[\w-]+"?\s*\([^)]+\)(?:\s+ON\s+DELETE\s+(?:CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(?:CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/gi,
      "",
    )
    .replace(
      /\s+REFERENCES\s+"?[\w-]+"?\s*\([^)]+\)(?:\s+ON\s+DELETE\s+(?:CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?(?:\s+ON\s+UPDATE\s+(?:CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION))?/gi,
      "",
    );
}

async function syncShardToTurso(
  databaseName: DatabaseShardName,
  databaseUrl: string,
  authToken: string,
): Promise<void> {
  const sqlitePath = path.join(SQLITE_DIRECTORY, sqliteFileNameForShard(databaseName));
  const sqlite = new Database(sqlitePath, { readonly: true });
  const client = createClient({ url: databaseUrl, authToken });
  try {
    await client.execute("PRAGMA foreign_keys = OFF");
    for (const table of [...DATABASE_SHARDS[databaseName]].reverse()) {
      await client.execute(`DROP TABLE IF EXISTS ${quoteIdent(table)}`);
    }
    for (const table of DATABASE_SHARDS[databaseName]) {
      for (const sql of schemaSql(sqlite, table)) {
        if (referencesOutsideShard(sql, DATABASE_SHARDS[databaseName])) {
          console.warn(`${databaseName}.${table}: skipped cross-shard schema object`);
          continue;
        }
        try {
          await client.execute(stripCrossDatabaseReferences(sql));
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (!message.toLowerCase().includes("already exists")) {
            console.warn(`${databaseName}.${table}: skipped schema object: ${message}`);
          }
        }
      }
      await client.execute(`DELETE FROM ${quoteIdent(table)}`);
      const rows = sqlite.prepare(`SELECT * FROM ${quoteIdent(table)}`).all() as Record<
        string,
        unknown
      >[];
      for (const row of rows) {
        const columns = Object.keys(row);
        await client.execute(
          `INSERT OR REPLACE INTO ${quoteIdent(table)} (${columns
            .map(quoteIdent)
            .join(",")}) VALUES (${columns.map((column) => sqlLiteral(row[column])).join(",")})`,
        );
      }
    }
    await client.execute("PRAGMA foreign_keys = ON");
  } finally {
    sqlite.close();
  }
}

export async function provisionDatabaseShards(): Promise<void> {
  const values = readEnvFiles();
  const organization = values.TURSO_ORGANIZATION;
  const apiToken = values.TURSO_API_TOKEN;
  if (!organization || !apiToken) {
    throw new Error("TURSO_ORGANIZATION and TURSO_API_TOKEN are required.");
  }

  for (const databaseName of Object.keys(DATABASE_SHARDS) as DatabaseShardName[]) {
    const database = await ensureDatabase(organization, apiToken, databaseName);
    const hostname = database.Hostname || database.hostname;
    if (!hostname) throw new Error(`Turso database hostname missing for ${databaseName}`);
    const databaseUrl = `libsql://${hostname}`;
    const authToken = await createToken(organization, apiToken, databaseName);
    const prefix = envPrefixForShard(databaseName);
    const entries = {
      [`${prefix}_DATABASE_URL`]: databaseUrl,
      [`${prefix}_DATABASE_AUTH_TOKEN`]: authToken,
    };
    updateEnvFile(".env", entries);
    updateEnvFile(".env.local", entries);
    await syncShardToTurso(databaseName, databaseUrl, authToken);
    console.log(`${databaseName}: provisioned and synced`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  provisionDatabaseShards().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
