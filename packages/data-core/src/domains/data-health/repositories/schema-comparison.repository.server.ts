import { advertisementsDataSource, productsDataSource, usersDataSource } from "../../../core";
import "server-only";

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { createClient } from "@libsql/client";

import { readOptionalEnv } from "@/core/config/server-env.values";
import {
  DATABASE_SHARD_NAMES,
  envPrefixForShard,
  sqliteFileNameForShard,
  type DatabaseShardName,
} from "../../../core/database/database-shards";
import { SQLITE_DIRECTORY } from "../../../core/database/environment";

import type {
  DataHealthSchemaComparison,
  DataHealthSchemaDifference,
} from "@/modules/data-health/domain/types";
import { resolveDataHealthExecutionContext } from "@/modules/data-health/domain/execution-context.server";

type Row = Record<string, unknown>;
type Executor = {
  execute(
    sql: string | { sql: string; args?: unknown[] },
    params?: unknown[],
  ): Promise<unknown>;
};

const nodeRequire = createRequire(import.meta.url);

interface SchemaObject {
  type: string;
  name: string;
  table: string;
  sql: string;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
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

async function execute(executor: Executor, sql: string): Promise<Row[]> {
  try {
    return rowsOf(await executor.execute(sql));
  } catch {
    return rowsOf(await executor.execute({ sql, args: [] }));
  }
}

function normalizeSql(value: string): string {
  return value
    .replace(/[`"]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([(),])\s*/g, "$1")
    .replace(/\s*;\s*$/, "")
    .trim()
    .toLowerCase();
}

async function readSchema(
  executor: Executor,
): Promise<Map<string, SchemaObject>> {
  const master = await execute(
    executor,
    "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND type IN ('table','index','view','trigger')",
  );
  const schema = new Map<string, SchemaObject>();
  for (const row of master) {
    const type = text(row.type);
    const name = text(row.name);
    const table = text(row.tbl_name);
    const object: SchemaObject = {
      type,
      name,
      table,
      sql: normalizeSql(text(row.sql)),
    };
    schema.set(`${type}:${name}`, object);
  }
  return schema;
}

class LocalShardSchemaExecutor implements Executor {
  private readonly db: any;

  constructor(databaseName: DatabaseShardName) {
    const sqliteModule = nodeRequire("better-sqlite3");
    const Database = sqliteModule.default ?? sqliteModule;
    this.db = new Database(path.join(SQLITE_DIRECTORY, sqliteFileNameForShard(databaseName)), {
      readonly: true,
    });
  }

  async execute(sql: string | { sql: string; args?: unknown[] }, params: unknown[] = []) {
    const statement = typeof sql === "string" ? sql : sql.sql;
    const args = typeof sql === "string" ? params : (sql.args ?? []);
    return this.db.prepare(statement).all(...args);
  }
}


function schemaVersion(schema: Map<string, SchemaObject>): string {
  const canonical = [...schema.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, value.sql]);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function compareSchemas(
  database: string,
  local: Map<string, SchemaObject>,
  cloud: Map<string, SchemaObject>,
): DataHealthSchemaDifference {
  const operations: DataHealthSchemaDifference["operations"] = [];
  const warnings: string[] = [];
  for (const [key, localObject] of local) {
    const cloudObject = cloud.get(key);
    if (!cloudObject) {
      operations.push({
        type: `MISSING_${localObject.type.toUpperCase()}`,
        tableName: localObject.table || localObject.name,
        description: `${localObject.type} مفقود في Turso: ${localObject.name}`,
      });
      continue;
    }
    if (localObject.sql !== cloudObject.sql) {
      warnings.push(
        `اختلاف في ${localObject.type} ${localObject.name} أو أعمدته أو قيوده.`,
      );
    }
  }
  for (const [key, cloudObject] of cloud) {
    if (!local.has(key)) {
      operations.push({
        type: `EXTRA_${cloudObject.type.toUpperCase()}`,
        tableName: cloudObject.table || cloudObject.name,
        description: `${cloudObject.type} زائد في Turso: ${cloudObject.name}`,
      });
    }
  }
  return {
    database,
    status:
      operations.length === 0 && warnings.length === 0
        ? "matched"
        : "different",
    sqliteVersion: schemaVersion(local),
    tursoVersion: schemaVersion(cloud),
    operations,
    warnings,
  };
}

function credentials(urlKey: string, tokenKey: string) {
  const url = readOptionalEnv(urlKey);
  const authToken = readOptionalEnv(tokenKey);
  return url && authToken ? { url, authToken } : null;
}

const SOURCES = [
  {
    label: "users",
    local: () => usersDataSource as unknown as Executor,
    credentials: () => credentials("TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"),
  },
  {
    label: "product",
    local: () => productsDataSource as unknown as Executor,
    credentials: () =>
      credentials("TURSO_PRODUCT_DATABASE_URL", "TURSO_PRODUCT_AUTH_TOKEN"),
  },
  {
    label: "advertisements",
    local: () => advertisementsDataSource as unknown as Executor,
    credentials: () =>
      credentials(
        "TURSO_ADVERTISEMENTS_DATABASE_URL",
        "TURSO_ADVERTISEMENTS_AUTH_TOKEN",
      ),
  },
  ...DATABASE_SHARD_NAMES.map((databaseName) => {
    const prefix = envPrefixForShard(databaseName);
    return {
      label: databaseName,
      local: () => new LocalShardSchemaExecutor(databaseName),
      credentials: () =>
        credentials(`${prefix}_DATABASE_URL`, `${prefix}_DATABASE_AUTH_TOKEN`),
    };
  }),
] as const;

export class SchemaComparisonRepository {
  async compare(): Promise<DataHealthSchemaComparison> {
    if (!resolveDataHealthExecutionContext().schemaComparisonAllowed) {
      return {
        available: false,
        readOnly: true,
        generatedAt: new Date().toISOString(),
        databases: SOURCES.map((source) => ({
          database: source.label,
          status: "skipped",
          operations: [],
          warnings: [],
          message: "مقارنة البنية متاحة في بيئة التطوير فقط.",
        })),
      };
    }

    const databases: DataHealthSchemaDifference[] = [];
    for (const source of SOURCES) {
      const credentials = source.credentials();
      if (!credentials) {
        databases.push({
          database: source.label,
          status: "skipped",
          operations: [],
          warnings: [],
          message: "بيانات اتصال Turso غير مهيأة.",
        });
        continue;
      }
      const cloud = createClient(credentials);
      try {
        databases.push(
          compareSchemas(
            source.label,
            await readSchema(source.local()),
            await readSchema(cloud as unknown as Executor),
          ),
        );
      } catch (error) {
        databases.push({
          database: source.label,
          status: "error",
          operations: [],
          warnings: [],
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        cloud.close();
      }
    }
    return {
      available: true,
      readOnly: true,
      generatedAt: new Date().toISOString(),
      databases,
    };
  }
}

export const schemaComparisonRepository = new SchemaComparisonRepository();
