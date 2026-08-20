import { existsSync } from "node:fs";
import path from "node:path";
import { resolveSqliteDirectory } from "@asol/dev-core/server";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { createClient, type Client, type InStatement } from "@libsql/client";
import storageProfiles from "@asol/storage-core/profiles-config";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
const TIMEOUT_MS = 20_000;

const dbTargets = [
  { dbPrefix: "TURSO_PRODUCT", sqliteFile: "product.db", table: "products", id: "id", columns: ["images_json"] },
  { dbPrefix: "TURSO_PRODUCT", sqliteFile: "product.db", table: "product_reviews", id: "id", columns: ["reviewer_avatar_url"] },
  { dbPrefix: "PROFILE_SOCIAL", sqliteFile: "profile-social.db", table: "profile_reviews", id: "id", columns: ["reviewer_avatar_url"] },
  { dbPrefix: "PROFILE_CATALOG", sqliteFile: "profile-catalog.db", table: "pharmacy_profile_product_overrides", id: "id", columns: ["image_url"] },
  { dbPrefix: "ORDERS_ITEMS", sqliteFile: "orders-items.db", table: "custom_request_images", id: "id", columns: ["image_url"] },
  { dbPrefix: "TURSO_ADVERTISEMENTS", sqliteFile: "advertisements.db", table: "hero_slider", id: "id", columns: ["config_json"] },
  { dbPrefix: "TURSO_ADVERTISEMENTS", sqliteFile: "advertisements.db", table: "trending_ribbon", id: "id", columns: ["config_json"] },
] as const;

interface R2Module {
  deleteR2Object(key: string): Promise<void>;
  downloadR2Object(key: string): Promise<{
    body: Uint8Array;
    contentType?: string;
  }>;
  listR2Objects(
    prefix: string,
    maxKeys?: number,
    continuationToken?: string,
  ): Promise<{
    objects: Array<{ path: string; updatedAt?: string }>;
    continuationToken?: string;
    isTruncated?: boolean;
  }>;
  uploadR2Object(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
  ): Promise<unknown>;
}

let r2Module: R2Module | null = null;

async function r2(): Promise<R2Module> {
  if (!r2Module) {
    r2Module = await import("@asol/storage-core/server") as unknown as R2Module;
  }
  return r2Module;
}

function requireConfig(): void {
  if (!PUBLIC_URL) throw new Error("R2_PUBLIC_URL environment variable is required");
}

function profileMappings(): Array<{ id: string; localFolder: string; cloudFolder: string }> {
  return storageProfiles.profiles
    .filter((profile) => profile.enabled && profile.provider === "CloudflareR2")
    .map((profile) => ({
      id: profile.id,
      localFolder: profile.folder.replace(/^\/+|\/+$/g, ""),
      cloudFolder: (profile.cloudFolder ?? profile.folder).replace(/^\/+|\/+$/g, ""),
    }))
    .filter((profile) => profile.localFolder !== profile.cloudFolder);
}

async function listAll(prefix: string): Promise<string[]> {
  const client = await r2();
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await client.listR2Objects(prefix, 1000, token);
    keys.push(...page.objects.map((item) => item.path).filter(Boolean));
    token = page.isTruncated ? page.continuationToken : undefined;
  } while (token);
  return keys;
}

function withTimeout<T>(action: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    action,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), TIMEOUT_MS),
    ),
  ]);
}

async function copyObject(sourceKey: string, targetKey: string): Promise<void> {
  const client = await r2();
  const downloaded = await withTimeout(
    client.downloadR2Object(sourceKey),
    `download ${sourceKey}`,
  );
  await withTimeout(
    client.uploadR2Object(targetKey, downloaded.body, downloaded.contentType),
    `upload ${targetKey}`,
  );
}

function replacementPairs() {
  return profileMappings().map((mapping) => ({
    oldPath: mapping.localFolder,
    newPath: mapping.cloudFolder,
    oldUrl: `${PUBLIC_URL}/${mapping.localFolder}`,
    newUrl: `${PUBLIC_URL}/${mapping.cloudFolder}`,
  }));
}

function rewriteText(value: string): { value: string; changed: boolean } {
  let next = value;
  for (const pair of replacementPairs()) {
    next = next.split(pair.oldUrl).join(pair.newUrl);
    next = next.split(`"filePathOrProviderId":"${pair.oldPath}/`).join(`"filePathOrProviderId":"${pair.newPath}/`);
  }
  return { value: next, changed: next !== value };
}

function sqliteTableExists(db: Database.Database, table: string): boolean {
  return Boolean(
    db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(table),
  );
}

async function updateSqliteReferences(): Promise<number> {
  let updates = 0;
  for (const target of dbTargets) {
    const dbPath = path.join(resolveSqliteDirectory(), target.sqliteFile);
    if (!existsSync(dbPath)) continue;
    const db = new Database(dbPath);
    try {
      if (!sqliteTableExists(db, target.table)) continue;
      for (const column of target.columns) {
        const rows = db
          .prepare(
            `SELECT ${JSON.stringify(target.id)} id, ${JSON.stringify(column)} value FROM ${JSON.stringify(target.table)}`,
          )
          .all() as Array<{ id: unknown; value: unknown }>;
        for (const row of rows) {
          const migrated = rewriteText(String(row.value ?? ""));
          if (!migrated.changed) continue;
          db.prepare(
            `UPDATE ${JSON.stringify(target.table)} SET ${JSON.stringify(column)}=? WHERE ${JSON.stringify(target.id)}=?`,
          ).run(migrated.value, row.id);
          updates += 1;
        }
      }
    } finally {
      db.close();
    }
  }
  return updates;
}

function credentialsFor(prefix: string): { url: string; authToken: string } | null {
  const url = process.env[`${prefix}_DATABASE_URL`];
  const authToken =
    process.env[`${prefix}_DATABASE_AUTH_TOKEN`] || process.env[`${prefix}_AUTH_TOKEN`];
  if (!url || !authToken) return null;
  return { url, authToken };
}

async function tursoExecuteWithTimeout(
  client: Client,
  statement: InStatement,
) {
  return withTimeout(client.execute(statement), "turso");
}

async function tursoTableExists(client: Client, table: string): Promise<boolean> {
  const result = await tursoExecuteWithTimeout(client, {
    sql: "SELECT 1 ok FROM sqlite_master WHERE type='table' AND name=? LIMIT 1",
    args: [table],
  });
  return result.rows.length > 0;
}

async function updateTursoReferences(): Promise<number> {
  let updates = 0;
  for (const target of dbTargets) {
    const creds = credentialsFor(target.dbPrefix);
    if (!creds) continue;
    const client = createClient(creds);
    if (!(await tursoTableExists(client, target.table))) continue;
    for (const column of target.columns) {
      const rows = await tursoExecuteWithTimeout(client, {
        sql: `SELECT ${JSON.stringify(target.id)} id, ${JSON.stringify(column)} value FROM ${JSON.stringify(target.table)}`,
        args: [],
      });
      for (const row of rows.rows) {
        const migrated = rewriteText(String(row.value ?? ""));
        if (!migrated.changed) continue;
        await tursoExecuteWithTimeout(client, {
          sql: `UPDATE ${JSON.stringify(target.table)} SET ${JSON.stringify(column)}=? WHERE ${JSON.stringify(target.id)}=?`,
          args: [migrated.value, row.id as string],
        });
        updates += 1;
      }
    }
  }
  return updates;
}

async function main(): Promise<void> {
  requireConfig();
  const copied: Array<{ oldKey: string; newKey: string }> = [];
  const failed: Array<{ oldKey: string; newKey: string; reason: string }> = [];

  for (const mapping of profileMappings()) {
    const keys = await listAll(`${mapping.localFolder}/`);
    for (const oldKey of keys) {
      const suffix = oldKey.slice(mapping.localFolder.length + 1);
      const newKey = `${mapping.cloudFolder}/${suffix}`;
      try {
        await copyObject(oldKey, newKey);
        copied.push({ oldKey, newKey });
      } catch (error) {
        failed.push({
          oldKey,
          newKey,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  const localReferenceUpdates = await updateSqliteReferences();
  const tursoReferenceUpdates = await updateTursoReferences();

  if (failed.length === 0) {
    const client = await r2();
    for (const item of copied) {
      await client.deleteR2Object(item.oldKey);
    }
  }

  console.log(
    JSON.stringify(
      {
        mappings: profileMappings(),
        copied: copied.length,
        deletedOldObjects: failed.length === 0 ? copied.length : 0,
        failed,
        localReferenceUpdates,
        tursoReferenceUpdates,
      },
      null,
      2,
    ),
  );

  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
