import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  DATABASE_SHARDS,
  MARKETPLACE_ORDER_SHARDS,
  PROFILE_SHARDS,
  sqliteFileNameForShard,
  type DatabaseShardName,
} from "../src/core/database/database-shards";
import { SQLITE_DIRECTORY } from "../src/core/database/environment";

type ShardMap = Record<string, readonly string[]>;

const SOURCE_DATABASES: Array<{
  sourceFile: string;
  shards: ShardMap;
}> = [
  {
    sourceFile: "profile.db",
    shards: PROFILE_SHARDS,
  },
  {
    sourceFile: "marketplace-orders.db",
    shards: MARKETPLACE_ORDER_SHARDS,
  },
];

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function tableExists(db: Database.Database, tableName: string): boolean {
  const row = db
    .prepare("SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=?")
    .get(tableName);
  return Boolean(row);
}

function tableSql(db: Database.Database, tableName: string): string {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
    .get(tableName) as { sql?: string } | undefined;
  if (!row?.sql) throw new Error(`Table schema not found: ${tableName}`);
  return row.sql;
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

function dependentObjects(db: Database.Database, tableName: string): string[] {
  const pattern = `%${tableName}%`;
  return db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type IN ('index','trigger','view') AND tbl_name=? AND sql IS NOT NULL UNION ALL SELECT sql FROM sqlite_master WHERE type IN ('trigger','view') AND sql LIKE ? AND sql IS NOT NULL",
    )
    .all(tableName, pattern)
    .map((row) => (row as { sql: string }).sql);
}

function referencesOutsideShard(sql: string, shardTables: readonly string[]): boolean {
  const own = new Set(shardTables);
  const allTables = Object.values(DATABASE_SHARDS).flat();
  return allTables.some((table) => !own.has(table) && new RegExp(`\\b${table}\\b`, "i").test(sql));
}

function copyTable(source: Database.Database, target: Database.Database, tableName: string): void {
  target.exec(stripCrossDatabaseReferences(tableSql(source, tableName)));
  const rows = source.prepare(`SELECT * FROM ${quoteIdent(tableName)}`).all() as Record<
    string,
    unknown
  >[];
  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  const insert = target.prepare(
    `INSERT INTO ${quoteIdent(tableName)} (${columns.map(quoteIdent).join(",")}) VALUES (${columns
      .map(() => "?")
      .join(",")})`,
  );
  const insertMany = target.transaction((records: Record<string, unknown>[]) => {
    for (const row of records) {
      insert.run(...columns.map((column) => row[column]));
    }
  });
  insertMany(rows);
}

function replaceShardFile(stagedPath: string, targetPath: string): boolean {
  if (!fs.existsSync(targetPath)) {
    fs.renameSync(stagedPath, targetPath);
    return true;
  }

  const backupPath = `${targetPath}.replace-${process.pid}`;
  try {
    fs.renameSync(targetPath, backupPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Skipped ${path.basename(targetPath)} because it is in use: ${message}`);
    return false;
  }

  try {
    fs.renameSync(stagedPath, targetPath);
    fs.rmSync(backupPath, { force: true });
    return true;
  } catch (error) {
    fs.renameSync(backupPath, targetPath);
    throw error;
  }
}

function splitSource(sourceFile: string, shards: ShardMap): void {
  const sourcePath = path.join(SQLITE_DIRECTORY, sourceFile);
  if (!fs.existsSync(sourcePath)) throw new Error(`Source database missing: ${sourcePath}`);

  const source = new Database(sourcePath, { readonly: true });
  try {
    for (const [databaseName, tables] of Object.entries(shards)) {
      const targetPath = path.join(
        SQLITE_DIRECTORY,
        sqliteFileNameForShard(databaseName as DatabaseShardName),
      );
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      const stagedPath = `${targetPath}.staged-${process.pid}`;
      fs.rmSync(stagedPath, { force: true });

      const target = new Database(stagedPath);
      try {
        target.pragma("foreign_keys = OFF");
        for (const tableName of tables) {
          if (!tableExists(source, tableName)) {
            throw new Error(`${sourceFile} does not contain required table ${tableName}`);
          }
          copyTable(source, target, tableName);
        }
        for (const tableName of tables) {
          for (const sql of dependentObjects(source, tableName)) {
            if (referencesOutsideShard(sql, tables)) {
              console.warn(`${databaseName}: skipped cross-shard dependent object for ${tableName}`);
              continue;
            }
            try {
              target.exec(sql);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
            if (!message.toLowerCase().includes("already exists")) {
              console.warn(
                `${databaseName}: skipped cross-shard dependent object for ${tableName}: ${message}`,
              );
            }
            }
          }
        }
        target.pragma("foreign_keys = ON");
      } finally {
        target.close();
      }

      if (replaceShardFile(stagedPath, targetPath)) {
        console.log(`${databaseName}: ${tables.length} table(s) copied to ${targetPath}`);
      } else {
        fs.rmSync(stagedPath, { force: true });
      }
    }
  } finally {
    source.close();
  }
}

for (const source of SOURCE_DATABASES) {
  splitSource(source.sourceFile, source.shards);
}
